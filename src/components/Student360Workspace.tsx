import toast from 'react-hot-toast';
import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Users, User, Search } from 'lucide-react';
import { client } from '../lib/api';
import { Skeleton, EmptyState } from './ui';
import { useDebounce } from '../hooks/useDebounce';
import { StudentDossier, Avatar, type DossierTab } from './student360/StudentDossier';
import { formatAcademicProfile, formatDateTime, formatDuration } from './student360/format';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function printStudentFullHistory(profileData: any) {
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Please allow popups in your browser to print the student history report.');
    return;
  }

  const stats = profileData.summaryStats || {};
  const coursesHistory: any[] = profileData.coursesHistory || [];
  const allVideosWatched: any[] = profileData.allVideosWatched || [];
  const quizAttempts: any[] = profileData.quizAttempts || [];
  const examAttempts: any[] = profileData.examAttempts || [];
  const redeemedCodes: any[] = profileData.redeemedCodes || [];
  const codeHistory: any[] = profileData.codeHistory || [];
  const deviceHistory: any[] = profileData.deviceHistory || [];
  const deviceSessions: any[] = profileData.deviceSessions || [];
  const timeline: any[] = profileData.timeline || [];

  const coursesHtml =
    coursesHistory.length === 0
      ? `<p class="empty">No courses or lectures accessed yet.</p>`
      : coursesHistory
          .map((course, cIdx) => {
            const courseStatus = course.isFree
              ? 'Free Course'
              : course.hasDirectCourseAccess
                ? course.isExpired
                  ? 'Full Course Access (Expired)'
                  : 'Full Course Access (Active)'
                : 'Lecture-by-Lecture Access';

            const lecturesHtml =
              !course.lectures || course.lectures.length === 0
                ? `<p class="empty">No lectures in this course.</p>`
                : course.lectures
                    .map((lec: any, lIdx: number) => {
                      const lecStatus = !lec.isUnlocked
                        ? 'Not Unlocked'
                        : lec.isExpired
                          ? 'Expired'
                          : lec.isStarted
                            ? 'Started & Active'
                            : 'Unlocked (Not Started)';

                      const codesStr =
                        lec.codesUsed?.length > 0
                          ? lec.codesUsed
                              .map(
                                (c: any) =>
                                  `${escapeHtml(c.code)} (${escapeHtml(formatDateTime(c.redeemedAt))})`,
                              )
                              .join(', ')
                          : '—';

                      const videosRows =
                        !lec.videos || lec.videos.length === 0
                          ? `<tr><td colspan="9" class="empty-cell">No video sessions in this lecture</td></tr>`
                          : lec.videos
                              .map((v: any, vIdx: number) => {
                                const limitText =
                                  v.maxViews !== null
                                    ? `${v.usedViews} / ${v.effectiveMaxViews} (Orig: ${v.maxViews}${v.grantedViews > 0 ? ` + Granted: ${v.grantedViews}` : ''}, Rem: ${v.remainingViews})`
                                    : `${v.usedViews} / Unlimited`;

                                const logsText =
                                  v.playbackLogs && v.playbackLogs.length > 0
                                    ? v.playbackLogs
                                        .map(
                                          (log: any) =>
                                            `<div class="log-item">#${log.index}: ${escapeHtml(formatDateTime(log.openedAt))} — <strong>${log.consumed ? 'Confirmed Watch (View Consumed)' : 'Opened Video Stream'}</strong></div>`,
                                        )
                                        .join('')
                                    : '<span class="muted">Never opened</span>';

                                return `
                                  <tr class="${v.isWatched ? 'watched-row' : ''}">
                                    <td>${vIdx + 1}</td>
                                    <td><strong>${escapeHtml(v.sessionTitle)}</strong></td>
                                    <td>${escapeHtml(formatDuration(v.duration))}</td>
                                    <td class="center"><strong>${v.watchCount ?? v.usedViews ?? 0}</strong></td>
                                    <td class="center">${v.streamOpensCount ?? 0}</td>
                                    <td>${escapeHtml(limitText)}</td>
                                    <td>${
                                      v.isCompleted
                                        ? `<span class="badge badge-success">Completed (${escapeHtml(formatDateTime(v.completedAt))})</span>`
                                        : v.isWatched
                                          ? `<span class="badge badge-info">Watched (In Progress)</span>`
                                          : `<span class="badge badge-muted">Not Watched</span>`
                                    }</td>
                                    <td>
                                      <div><strong>First:</strong> ${escapeHtml(formatDateTime(v.firstWatchedAt))}</div>
                                      <div><strong>Last:</strong> ${escapeHtml(formatDateTime(v.lastWatchedAt))}</div>
                                    </td>
                                    <td>${logsText}</td>
                                  </tr>
                                `;
                              })
                              .join('');

                      return `
                        <div class="lecture-block">
                          <div class="lecture-header">
                            <div>
                              <strong>Lecture ${lIdx + 1}: ${escapeHtml(lec.lectureTitle)}</strong>
                              ${lec.chapterTitle ? `<span class="muted"> (Chapter: ${escapeHtml(lec.chapterTitle)})</span>` : ''}
                            </div>
                            <div>
                              <span class="badge ${lec.isUnlocked ? (lec.isExpired ? 'badge-danger' : 'badge-success') : 'badge-muted'}">${escapeHtml(lecStatus)}</span>
                            </div>
                          </div>
                          <div class="lecture-meta">
                            <span><strong>Unlocked At:</strong> ${escapeHtml(formatDateTime(lec.unlockedAt))}</span>
                            <span><strong>Started At:</strong> ${escapeHtml(formatDateTime(lec.activatedAt))}</span>
                            <span><strong>Expires At:</strong> ${escapeHtml(formatDateTime(lec.expiresAt))}</span>
                            <span><strong>View Limit Policy:</strong> ${lec.maxViews !== null ? `${lec.maxViews} views per video` : 'Unlimited'}</span>
                            <span><strong>Videos Watched:</strong> ${lec.watchedVideosCount}/${lec.totalVideosCount} (Total Watches: ${lec.totalWatchesCount}, Stream Opens: ${lec.totalStreamOpensCount})</span>
                            <span><strong>Code(s) Used:</strong> ${codesStr}</span>
                          </div>
                          <table>
                            <thead>
                              <tr>
                                <th style="width: 28px;">#</th>
                                <th>Video / Session Title</th>
                                <th style="width: 65px;">Duration</th>
                                <th style="width: 75px;">Confirmed Watches</th>
                                <th style="width: 70px;">Stream Opens</th>
                                <th style="width: 130px;">View Limit & Allowance</th>
                                <th style="width: 120px;">Completion Status</th>
                                <th style="width: 155px;">First / Last Watched</th>
                                <th>Complete Watch Session Timestamps (Evidence)</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${videosRows}
                            </tbody>
                          </table>
                        </div>
                      `;
                    })
                    .join('');

            return `
              <div class="course-card">
                <div class="course-header">
                  <div>
                    <h3>${cIdx + 1}. Course: ${escapeHtml(course.courseTitle)}</h3>
                    <div class="course-sub">
                      <span><strong>Access Type:</strong> ${escapeHtml(courseStatus)}</span> |
                      <span><strong>Unlocked At:</strong> ${escapeHtml(formatDateTime(course.unlockedAt))}</span> |
                      <span><strong>Expires At:</strong> ${escapeHtml(formatDateTime(course.expiresAt))}</span>
                    </div>
                  </div>
                  <div class="course-stats">
                    <span>Lectures Unlocked: <strong>${course.unlockedLecturesCount}/${course.totalLecturesCount}</strong></span> |
                    <span>Videos Watched: <strong>${course.watchedVideosCount}/${course.totalVideosCount}</strong></span> |
                    <span>Total Video Watches: <strong>${course.totalVideoWatchesCount}</strong></span> |
                    <span>Stream Opens: <strong>${course.totalStreamOpensCount}</strong></span>
                  </div>
                </div>
                ${lecturesHtml}
              </div>
            `;
          })
          .join('');

  const watchedSummaryRows =
    allVideosWatched.length === 0
      ? `<tr><td colspan="9" class="empty-cell">No videos watched yet.</td></tr>`
      : allVideosWatched
          .map((v, idx) => {
            const timestamps =
              v.playbackLogs && v.playbackLogs.length > 0
                ? v.playbackLogs
                    .map(
                      (l: any) =>
                        `#${l.index}: ${escapeHtml(formatDateTime(l.openedAt))} (${l.consumed ? 'Watched' : 'Opened'})`,
                    )
                    .join('<br/>')
                : '—';
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(v.courseTitle)}</td>
                <td>${escapeHtml(v.lectureTitle)}</td>
                <td><strong>${escapeHtml(v.sessionTitle)}</strong></td>
                <td class="center"><strong>${v.watchCount ?? v.usedViews ?? 0}</strong></td>
                <td class="center">${v.streamOpensCount ?? 0}</td>
                <td>${v.maxViews !== null ? `${v.usedViews}/${v.effectiveMaxViews} (Granted: ${v.grantedViews})` : 'Unlimited'}</td>
                <td>${v.isCompleted ? `Yes (${escapeHtml(formatDateTime(v.completedAt))})` : 'No'}</td>
                <td>${timestamps}</td>
              </tr>
            `;
          })
          .join('');

  const codesRows =
    redeemedCodes.length === 0 && codeHistory.length === 0
      ? `<tr><td colspan="7" class="empty-cell">No activation codes redeemed.</td></tr>`
      : (codeHistory.length > 0 ? codeHistory : redeemedCodes)
          .map((c: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td><code>${escapeHtml(c.code)}</code></td>
              <td>${escapeHtml(c.action || c.status || 'REDEEMED')}</td>
              <td>${escapeHtml(c.courseTitle || '—')}</td>
              <td>${escapeHtml(c.lectureTitle || c.attachmentTitle || '—')}</td>
              <td>${escapeHtml(formatDateTime(c.createdAt || c.redeemedAt))}</td>
              <td>${escapeHtml([c.ipAddress, c.browser].filter(Boolean).join(' • ') || '—')}</td>
            </tr>
          `)
          .join('');

  const quizExamRows =
    quizAttempts.length === 0 && examAttempts.length === 0
      ? `<tr><td colspan="8" class="empty-cell">No quiz or exam attempts recorded.</td></tr>`
      : [
          ...quizAttempts.map((q: any) => ({
            type: 'QUIZ',
            title: q.quizTitle || 'Quiz',
            courseTitle: q.courseTitle || '—',
            lectureTitle: q.lectureTitle || '—',
            score: q.score,
            points: `${q.earnedPoints ?? 0}/${q.totalPoints ?? 0}`,
            status: q.status,
            date: q.submittedAt || q.startedAt || q.createdAt,
          })),
          ...examAttempts.map((e: any) => ({
            type: 'EXAM',
            title: e.examTitle || 'Exam',
            courseTitle: e.courseTitle || '—',
            lectureTitle: e.lectureTitle || '—',
            score: e.score ?? 0,
            points: `${e.earnedPoints ?? 0}/${e.totalPoints ?? 0}`,
            status: e.status,
            date: e.submittedAt || e.startedAt || e.createdAt,
          })),
        ]
          .map(
            (a, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><span class="badge">${escapeHtml(a.type)}</span></td>
                <td><strong>${escapeHtml(a.title)}</strong></td>
                <td>${escapeHtml(a.courseTitle)}</td>
                <td>${escapeHtml(a.lectureTitle)}</td>
                <td><strong>${escapeHtml(a.score)}%</strong> (${escapeHtml(a.points)})</td>
                <td><span class="badge ${a.status === 'PASSED' ? 'badge-success' : a.status === 'FAILED' ? 'badge-danger' : ''}">${escapeHtml(a.status)}</span></td>
                <td>${escapeHtml(formatDateTime(a.date))}</td>
              </tr>
            `,
          )
          .join('');

  const deviceRows =
    deviceHistory.length === 0 && deviceSessions.length === 0
      ? `<tr><td colspan="6" class="empty-cell">No device events recorded.</td></tr>`
      : [
          ...deviceHistory.map((d: any) => ({
            action: d.action,
            fingerprint: d.deviceFingerprint,
            ip: d.ipAddress,
            browser: d.browser,
            date: d.createdAt,
          })),
          ...deviceSessions.map((ds: any) => ({
            action: ds.deletedAt ? 'SESSION_CLEARED' : 'ACTIVE_SESSION',
            fingerprint: ds.deviceFingerprint,
            ip: ds.ipAddress,
            browser: ds.browser,
            date: ds.lastLoginAt || ds.createdAt,
          })),
        ]
          .map(
            (d, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(d.action)}</strong></td>
                <td><code>${escapeHtml(d.fingerprint)}</code></td>
                <td>${escapeHtml(d.ip || '—')}</td>
                <td>${escapeHtml(d.browser || '—')}</td>
                <td>${escapeHtml(formatDateTime(d.date))}</td>
              </tr>
            `,
          )
          .join('');

  const timelineRows =
    timeline.length === 0
      ? `<tr><td colspan="5" class="empty-cell">No timeline events found.</td></tr>`
      : timeline
          .map(
            (ev: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="white-space: nowrap;"><strong>${escapeHtml(formatDateTime(ev.timestamp))}</strong></td>
                <td><span class="badge">${escapeHtml(ev.category)}</span></td>
                <td><strong>${escapeHtml(ev.title)}</strong></td>
                <td>${escapeHtml(ev.details)}</td>
              </tr>
            `,
          )
          .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en" dir="auto">
      <head>
        <meta charset="UTF-8" />
        <title>Student 360 Evidence Dossier - ${escapeHtml(profileData.fullName)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            line-height: 1.45;
          }
          .report-header {
            border-bottom: 3px solid #1e293b;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .report-header h1 {
            margin: 0 0 4px 0;
            font-size: 20px;
            color: #0f172a;
          }
          .report-header p {
            margin: 2px 0;
            color: #475569;
            font-size: 11px;
          }
          .section {
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          .section-title {
            background: #0f172a;
            color: #ffffff;
            padding: 7px 12px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
          }
          .info-item {
            font-size: 11px;
          }
          .info-item .label {
            color: #64748b;
            font-weight: 600;
            display: block;
            font-size: 10px;
            text-transform: uppercase;
          }
          .info-item .value {
            color: #0f172a;
            font-weight: 700;
            word-break: break-word;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .stat-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
            background: #f8fafc;
          }
          .stat-box .num {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            display: block;
          }
          .stat-box .lbl {
            font-size: 9.5px;
            color: #475569;
            text-transform: uppercase;
            font-weight: 600;
          }
          .course-card {
            border: 2px solid #94a3b8;
            border-radius: 6px;
            margin-bottom: 14px;
            overflow: hidden;
          }
          .course-header {
            background: #e2e8f0;
            padding: 10px 12px;
            border-bottom: 1px solid #94a3b8;
          }
          .course-header h3 {
            margin: 0 0 4px 0;
            font-size: 14px;
            color: #0f172a;
          }
          .course-sub, .course-stats {
            font-size: 10.5px;
            color: #334155;
            margin-top: 3px;
          }
          .lecture-block {
            padding: 10px 12px;
            border-bottom: 1px solid #cbd5e1;
          }
          .lecture-block:last-child {
            border-bottom: none;
          }
          .lecture-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .lecture-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 10px;
            color: #334155;
            background: #f1f5f9;
            padding: 5px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 6px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
          }
          tr { page-break-inside: avoid; }
          .watched-row { background: #f0fdf4; }
          .center { text-align: center; }
          .empty, .empty-cell {
            text-align: center;
            color: #64748b;
            font-style: italic;
            padding: 10px;
          }
          .muted { color: #64748b; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            background: #e2e8f0;
            color: #1e293b;
          }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          .badge-info { background: #dbeafe; color: #1e40af; }
          .badge-muted { background: #f1f5f9; color: #64748b; }
          .log-item {
            font-size: 9.5px;
            padding: 1px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .log-item:last-child { border-bottom: none; }
          code {
            font-family: Consolas, monospace;
            background: #f1f5f9;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 9.5px;
          }
          @media print {
            @page { size: A4 landscape; margin: 0.7cm; }
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <h1>STUDENT 360 — COMPLETE HISTORY & EVIDENCE REPORT</h1>
            <p>Complete Audit Record of Registration, Course & Lecture Access, Video Watch Counts, Timestamps, Quizzes, Codes & Device Activity</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Report Generated:</strong> ${escapeHtml(formatDateTime(new Date()))}</p>
            <p><strong>Student ID:</strong> <code>${escapeHtml(profileData.id)}</code></p>
            <p><strong>Account Status:</strong> ${profileData.isActive ? 'ACTIVE' : 'SUSPENDED'}</p>
          </div>
        </div>

        <!-- 1. Student Registration & Profile Evidence -->
        <div class="section">
          <div class="section-title">1. Student Identity & Registration Details (From Registration to Present)</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Full Name</span>
              <span class="value">${escapeHtml(profileData.fullName)}</span>
            </div>
            <div class="info-item">
              <span class="label">Email Address</span>
              <span class="value">${escapeHtml(profileData.email)}</span>
            </div>
            <div class="info-item">
              <span class="label">Phone / Parent Phone</span>
              <span class="value">${escapeHtml(profileData.phoneNumber || '—')} / ${escapeHtml(profileData.parentPhoneNumber || '—')}</span>
            </div>
            <div class="info-item">
              <span class="label">Registration Date & Time</span>
              <span class="value">${escapeHtml(formatDateTime(profileData.createdAt))}</span>
            </div>
            <div class="info-item">
              <span class="label">Last Login Date & Time</span>
              <span class="value">${escapeHtml(formatDateTime(profileData.lastLoginAt))}</span>
            </div>
            <div class="info-item">
              <span class="label">Bound Device ID</span>
              <span class="value"><code>${escapeHtml(profileData.deviceId || 'Not Bound')}</code></span>
            </div>
            <div class="info-item" style="grid-column: span 2;">
              <span class="label">Academic Profile</span>
              <span class="value">${escapeHtml(formatAcademicProfile(profileData))}</span>
            </div>
            <div class="info-item">
              <span class="label">Gamification & Engagement</span>
              <span class="value">XP: ${profileData.xp || 0} • Streak: ${profileData.streakDays || 0} days</span>
            </div>
          </div>
        </div>

        <!-- 2. Executive Summary Metrics -->
        <div class="section">
          <div class="section-title">2. Executive Activity Summary (Registration → Now)</div>
          <div class="stats-grid">
            <div class="stat-box">
              <span class="num">${stats.totalCoursesTouched ?? coursesHistory.length}</span>
              <span class="lbl">Courses Accessed</span>
            </div>
            <div class="stat-box">
              <span class="num">${stats.totalLecturesUnlocked ?? 0} (${stats.totalLecturesStarted ?? 0} Started)</span>
              <span class="lbl">Lectures Unlocked</span>
            </div>
            <div class="stat-box">
              <span class="num">${stats.totalUniqueVideosWatched ?? 0}</span>
              <span class="lbl">Unique Videos Watched</span>
            </div>
            <div class="stat-box">
              <span class="num">${stats.totalConfirmedVideoWatches ?? 0} (${stats.totalVideoStreamOpens ?? 0} Opens)</span>
              <span class="lbl">Total Video Watches</span>
            </div>
            <div class="stat-box">
              <span class="num">${stats.totalVideosCompleted ?? 0}</span>
              <span class="lbl">Videos Completed</span>
            </div>
            <div class="stat-box">
              <span class="num">${stats.totalCodesRedeemed ?? 0} Codes • ${stats.totalQuizAttempts ?? 0} Quizzes</span>
              <span class="lbl">Codes & Assessments</span>
            </div>
          </div>
        </div>

        <!-- 3. Detailed Course, Lecture & Video Watch Breakdown -->
        <div class="section">
          <div class="section-title">3. Complete Course, Lecture & Video Watch Breakdown</div>
          ${coursesHtml}
        </div>

        <!-- 4. Consolidated Watched Videos Summary -->
        <div class="section">
          <div class="section-title">4. Summary Table of Watched / Opened Videos & Exact Watch Timestamps</div>
          <table>
            <thead>
              <tr>
                <th style="width: 28px;">#</th>
                <th>Course</th>
                <th>Lecture</th>
                <th>Video Title</th>
                <th style="width: 75px;">Confirmed Watches</th>
                <th style="width: 70px;">Stream Opens</th>
                <th style="width: 110px;">View Limit Usage</th>
                <th style="width: 120px;">Completed</th>
                <th>Watch Timestamps Log</th>
              </tr>
            </thead>
            <tbody>
              ${watchedSummaryRows}
            </tbody>
          </table>
        </div>

        <!-- 5. Activation Codes & Access History -->
        <div class="section">
          <div class="section-title">5. Activation Codes & Content Redemption History</div>
          <table>
            <thead>
              <tr>
                <th style="width: 28px;">#</th>
                <th>Code</th>
                <th>Action / Status</th>
                <th>Course</th>
                <th>Lecture / File</th>
                <th>Date & Time</th>
                <th>IP / Browser</th>
              </tr>
            </thead>
            <tbody>
              ${codesRows}
            </tbody>
          </table>
        </div>

        <!-- 6. Quizzes & Exams History -->
        <div class="section">
          <div class="section-title">6. Quizzes & Exams Attempts History</div>
          <table>
            <thead>
              <tr>
                <th style="width: 28px;">#</th>
                <th style="width: 60px;">Type</th>
                <th>Assessment Title</th>
                <th>Course</th>
                <th>Lecture</th>
                <th>Score & Points</th>
                <th style="width: 80px;">Status</th>
                <th style="width: 145px;">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${quizExamRows}
            </tbody>
          </table>
        </div>

        <!-- 7. Device & Login Security History -->
        <div class="section">
          <div class="section-title">7. Device Binding & Security History</div>
          <table>
            <thead>
              <tr>
                <th style="width: 28px;">#</th>
                <th style="width: 120px;">Action / State</th>
                <th>Device Fingerprint</th>
                <th style="width: 110px;">IP Address</th>
                <th>Browser / User-Agent</th>
                <th style="width: 145px;">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${deviceRows}
            </tbody>
          </table>
        </div>

        <!-- 8. Complete Chronological Timeline (Registration to Now) -->
        <div class="section">
          <div class="section-title">8. Complete Chronological Audit Timeline (From Registration to Now)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 32px;">#</th>
                <th style="width: 150px;">Date & Exact Time</th>
                <th style="width: 120px;">Category</th>
                <th style="width: 240px;">Event / Action</th>
                <th>Evidence Details</th>
              </tr>
            </thead>
            <tbody>
              ${timelineRows}
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}

function downloadStudentHistoryCsv(profileData: any) {
  const headers = [
    'Section',
    'Timestamp',
    'Course',
    'Lecture',
    'Item / Video / Code / Quiz',
    'Action / Status',
    'Confirmed Watches (usedViews)',
    'Stream Opens',
    'View Limit / Score',
    'Completed',
    'Details',
  ];

  const rows: any[][] = [];

  // Registration row
  rows.push([
    'REGISTRATION',
    formatDateTime(profileData.createdAt),
    '',
    '',
    profileData.fullName,
    'ACCOUNT_REGISTERED',
    '',
    '',
    '',
    '',
    `Email: ${profileData.email} | Phone: ${profileData.phoneNumber || ''} | Level: ${formatAcademicProfile(profileData)}`,
  ]);

  // Courses, Lectures & Videos
  for (const c of profileData.coursesHistory || []) {
    for (const l of c.lectures || []) {
      rows.push([
        'LECTURE_ACCESS',
        formatDateTime(l.activatedAt || l.unlockedAt),
        c.courseTitle,
        l.lectureTitle,
        l.lectureTitle,
        l.isUnlocked ? (l.isStarted ? 'STARTED' : 'UNLOCKED') : 'NOT_UNLOCKED',
        l.totalWatchesCount ?? 0,
        l.totalStreamOpensCount ?? 0,
        l.maxViews !== null ? `Max ${l.maxViews}` : 'Unlimited',
        `${l.completedVideosCount}/${l.totalVideosCount}`,
        `Expires: ${formatDateTime(l.expiresAt)}`,
      ]);

      for (const v of l.videos || []) {
        const logsSummary = (v.playbackLogs || [])
          .map((p: any) => `#${p.index}:${formatDateTime(p.openedAt)}(${p.consumed ? 'Watched' : 'Opened'})`)
          .join(' ; ');
        rows.push([
          'VIDEO_WATCH',
          formatDateTime(v.lastWatchedAt || v.firstWatchedAt),
          c.courseTitle,
          l.lectureTitle,
          v.sessionTitle,
          v.isCompleted ? 'COMPLETED' : v.isWatched ? 'WATCHED' : 'NOT_WATCHED',
          v.watchCount ?? v.usedViews ?? 0,
          v.streamOpensCount ?? 0,
          v.maxViews !== null ? `${v.usedViews}/${v.effectiveMaxViews}` : 'Unlimited',
          v.isCompleted ? `Yes (${formatDateTime(v.completedAt)})` : 'No',
          `First: ${formatDateTime(v.firstWatchedAt)} | Last: ${formatDateTime(v.lastWatchedAt)} | Logs: ${logsSummary}`,
        ]);
      }
    }
  }

  // Timeline events
  for (const ev of profileData.timeline || []) {
    rows.push([
      `TIMELINE_${ev.category}`,
      formatDateTime(ev.timestamp),
      '',
      '',
      ev.title,
      ev.action,
      '',
      '',
      '',
      '',
      ev.details,
    ]);
  }

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student_360_history_${(profileData.fullName || 'student').replace(/\s+/g, '_')}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function Student360Workspace({ initialStudentId }: { initialStudentId?: string } = {}) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const debouncedSearch = useDebounce(search, 300);

  // Opened from a link (/admin/student-360/:id, e.g. the Users table or search) → show that student.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId ?? null);
  useEffect(() => {
    if (initialStudentId) setSelectedStudentId(initialStudentId);
  }, [initialStudentId]);
  // The open tab stays the same while the admin moves between students.
  const [tab, setTab] = useState<DossierTab>('overview');

  const fetchStudents = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const endpoint = `/admin/users?role=STUDENT&take=100${query ? `&search=${encodeURIComponent(query)}` : ''}`;
      const result = await client.get<{ items: any[] }>(endpoint);
      const items = (result as any)?.items || result;
      setStudents(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
      setStudents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents(debouncedSearch);
  }, [debouncedSearch, fetchStudents]);

  // Keep the address in sync so the page can be refreshed or the link shared (without re-mounting the route).
  useEffect(() => {
    const target = selectedStudentId ? `#/admin/student-360/${selectedStudentId}` : '#/admin/student-360';
    if (window.location.hash !== target) window.history.replaceState(null, '', target);
  }, [selectedStudentId]);

  const isActive = (s: any) => s.isActive ?? s.is_active ?? true;
  const shown = students.filter((s) => statusFilter === 'all' || (statusFilter === 'active' ? isActive(s) : !isActive(s)));
  const selected = !!selectedStudentId;

  // Arrow keys move through the list while it has focus.
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = shown.findIndex((s) => s.id === selectedStudentId);
    const next = shown[e.key === 'ArrowDown' ? Math.min(shown.length - 1, i + 1) : Math.max(0, i - 1)];
    if (next) {
      setSelectedStudentId(next.id);
      document.getElementById(`s360-${next.id}`)?.focus();
    }
  };

  return (
    <div className="animate-fade-up flex gap-5 xl:h-[calc(100vh-7rem)] min-h-[32rem]">
      {/* Student list */}
      <aside className={`flex-col gap-3 min-h-0 ${selected ? 'hidden xl:flex xl:w-80 shrink-0' : 'flex w-full'}`}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-display font-bold text-theme-text flex items-center gap-2">
            <User className="w-6 h-6 text-accent-700 dark:text-accent-300" /> Student 360
          </h1>
          {!loading && <span className="text-xs text-theme-muted">{shown.length} shown</span>}
        </div>
        {!selected && (
          <p className="text-sm text-theme-muted -mt-2">Pick a student to see their courses, watch history, results and access, and to manage them.</p>
        )}
        <div className={`flex gap-2 ${selected ? 'flex-col' : 'flex-col sm:flex-row'}`}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              dir="auto"
              type="search"
              placeholder="Name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-9 pe-3 py-2 bg-theme-card border border-theme-border rounded-xl text-sm focus:outline-none focus:border-accent-400 text-theme-text"
            />
          </div>
          <div className="inline-flex rounded-xl border border-theme-border p-0.5 bg-theme-card/50 self-start">
            {(['all', 'active', 'suspended'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                aria-pressed={statusFilter === f}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${statusFilter === f ? 'bg-accent-500 text-white' : 'text-theme-muted hover:text-theme-text'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl flex-1 min-h-0 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No students found" />
          ) : (
            <ul
              className={`flex-1 overflow-y-auto scrollbar-thin divide-y divide-theme-border/60 ${selected ? '' : 'sm:grid sm:grid-cols-2 2xl:grid-cols-3 sm:divide-y-0'}`}
              onKeyDown={onListKey}
            >
              {shown.map((s) => {
                const active = selectedStudentId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      id={`s360-${s.id}`}
                      type="button"
                      onClick={() => setSelectedStudentId(s.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full text-start px-3 py-2.5 flex items-center gap-3 transition-colors border-s-4 ${
                        active ? 'bg-accent-500/10 border-accent-500' : 'border-transparent hover:bg-theme-card'
                      }`}
                    >
                      <Avatar url={s.profilePictureUrl ?? s.avatar_url} name={s.fullName ?? s.full_name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-theme-text truncate">{s.fullName ?? s.full_name}</p>
                        <p className="text-xs text-theme-muted truncate" dir="ltr">
                          {s.phoneNumber || s.email}
                        </p>
                      </div>
                      {!isActive(s) && <span className="w-2 h-2 rounded-full bg-error-500 shrink-0" title="Suspended" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Student details */}
      {selectedStudentId && (
        <div className="flex-1 min-w-0 glass rounded-2xl border border-theme-border overflow-hidden animate-fade-in">
          <StudentDossier
            key={selectedStudentId}
            studentId={selectedStudentId}
            tab={tab}
            onTabChange={setTab}
            onClose={() => setSelectedStudentId(null)}
            onAccountChanged={() => fetchStudents(debouncedSearch)}
            onPrint={printStudentFullHistory}
            onExportCsv={downloadStudentHistoryCsv}
          />
        </div>
      )}
    </div>
  );
}
