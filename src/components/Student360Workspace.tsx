import toast from 'react-hot-toast';
import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Users,
  User,
  ShieldAlert,
  BookOpen,
  Search,
  X,
  Smartphone,
  Eye,
  Video,
  Printer,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  KeyRound,
  Calendar,
  Award,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { client } from '../lib/api';
import { Badge, Skeleton, EmptyState, Button, SectionHeader } from './ui';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';
import { QuizAttemptReviewModal } from './QuizAttemptReviewModal';

type TabKey =
  | 'ALL'
  | 'COURSES_VIDEOS'
  | 'VIDEO_LOG'
  | 'QUIZZES_EXAMS'
  | 'CODES_ACCESS'
  | 'DEVICES'
  | 'TIMELINE';

function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAcademicProfile(p: any): string {
  if (!p) return '—';
  if (p.educationLevel === 'HIGH_SCHOOL') {
    const parts = [
      'High School',
      p.highSchoolSystem,
      p.highSchoolGrade,
      p.traditionalBranch,
      p.baccalaureatePath,
      p.studyMode,
      p.studyLanguage,
    ].filter(Boolean);
    return parts.join(' • ');
  }
  const uni =
    p.academicUniversity?.nameEn ||
    p.academicUniversity?.nameAr ||
    p.otherUniversityName ||
    '';
  const fac =
    p.academicFaculty?.nameEn ||
    p.academicFaculty?.nameAr ||
    p.otherFacultyName ||
    '';
  const dep =
    p.academicDepartment?.nameEn ||
    p.academicDepartment?.nameAr ||
    p.otherDepartmentName ||
    '';
  const prog =
    p.academicProgram?.nameEn ||
    p.academicProgram?.nameAr ||
    p.otherProgramName ||
    '';
  return ['University', uni, fac, dep, prog].filter(Boolean).join(' • ');
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

export function Student360Workspace() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedVideoLogs, setExpandedVideoLogs] = useState<Record<string, boolean>>({});
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  const fetchStudents = async (query = '') => {
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
  };

  useEffect(() => {
    fetchStudents(debouncedSearch);
  }, [debouncedSearch]);

  const loadStudentProfile = async (studentId: string) => {
    setProfileLoading(true);
    try {
      const [userDetail, progressData] = await Promise.all([
        client.get<any>(`/admin/users/${studentId}`),
        client.get<any>(`/admin/users/${studentId}/progress`),
      ]);
      const merged = { ...userDetail, ...progressData };
      setProfileData(merged);
      // Expand all courses by default so admin sees complete data immediately
      const initialExpanded: Record<string, boolean> = {};
      for (const c of merged.coursesHistory || []) {
        initialExpanded[c.courseId] = true;
      }
      setExpandedCourses(initialExpanded);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load student 360 profile');
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    if (!selectedStudentId) {
      setProfileData(null);
      return;
    }
    loadStudentProfile(selectedStudentId);
  }, [selectedStudentId]);

  const handleResetDevice = async () => {
    if (!selectedStudentId) return;
    const ok = await confirm('Reset Device Lock', 'Confirm device lock reset?');
    if (!ok) return;
    try {
      await client.post(`/admin/users/${selectedStudentId}/reset-device`);
      toast.success('Device reset successfully');
      await loadStudentProfile(selectedStudentId);
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset device');
    }
  };

  const handleGrantViews = async (sv: any) => {
    if (!selectedStudentId) return;
    const remaining =
      sv.effectiveMaxViews !== null
        ? Math.max(0, sv.effectiveMaxViews - sv.usedViews)
        : 0;
    const input = window.prompt(
      `How many additional views would you like to grant for ${sv.sessionTitle}? (Enter a positive integer)`,
    );
    if (!input) return;
    const additionalViews = parseInt(input, 10);
    if (isNaN(additionalViews) || additionalViews <= 0) {
      toast.error('Please enter a valid positive integer.');
      return;
    }

    const message = `
Current:
Used: ${sv.usedViews}
Original limit: ${sv.maxViews}
Previously granted: ${sv.grantedViews}
Effective limit: ${sv.effectiveMaxViews}
Remaining: ${remaining}

Admin enters:
Additional views: ${additionalViews}

After:
Used: ${sv.usedViews}
Original limit: ${sv.maxViews}
Granted: ${sv.grantedViews + additionalViews}
Effective limit: ${sv.effectiveMaxViews + additionalViews}
Remaining: ${Math.max(0, sv.effectiveMaxViews + additionalViews - sv.usedViews)}

Are you sure you want to apply this grant?`;

    const ok = await confirm('Grant New Viewing Allowance', message);
    if (!ok) return;

    try {
      await client.post(
        `/admin/users/${selectedStudentId}/sessions/${sv.sessionId}/grant-views`,
        { additionalViews },
      );
      toast.success(`Successfully granted ${additionalViews} views`);
      await loadStudentProfile(selectedStudentId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to grant views');
    }
  };

  const filtered = students;

  const filteredTimeline = useMemo(() => {
    const list: any[] = profileData?.timeline || [];
    if (timelineFilter === 'ALL') return list;
    return list.filter((item) => item.category === timelineFilter);
  }, [profileData?.timeline, timelineFilter]);

  const stats = profileData?.summaryStats || {};

  return (
    <div className="space-y-6 animate-fade-up flex gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel: Student Directory */}
      <div
        className={`flex flex-col gap-4 ${selectedStudentId ? 'w-1/4 min-w-[260px]' : 'w-full'} transition-all duration-300`}
      >
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <User className="w-7 h-7 text-accent-700 dark:text-accent-300" /> Student 360
            </span>
          }
          subtitle={!selectedStudentId ? 'Comprehensive student lookup, watch history, and printable evidence dossier.' : undefined}
          actions={
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                dir="auto"
                type="text"
                placeholder="Search directory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 bg-theme-card border border-theme-border rounded-xl text-sm focus:outline-none focus:border-accent-400 text-theme-text ${selectedStudentId ? 'w-full' : 'w-64'}`}
              />
            </div>
          }
        />

        <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-40" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No students found" />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-3 ${selectedStudentId === s.id ? 'bg-theme-card border-l-4 border-accent-400' : 'border-l-4 border-transparent'}`}
                >
                  {s.profilePictureUrl ? (
                    <img
                      src={s.profilePictureUrl}
                      alt={s.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-white/[0.1]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                      {(s.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-theme-text truncate">{s.fullName}</p>
                    <p className="text-xs text-theme-muted truncate">{s.email}</p>
                    {s.phoneNumber && (
                      <p className="text-[11px] text-theme-muted/80 font-mono truncate">
                        {s.phoneNumber}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Student 360 Drawer */}
      {selectedStudentId && (
        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden animate-fade-in relative border border-theme-border">
          <button
            onClick={() => setSelectedStudentId(null)}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-text z-10"
            title="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>

          {profileLoading || !profileData ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Header Info & Print Actions */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pr-6">
                <div className="flex items-start gap-4">
                  {profileData.profilePictureUrl ? (
                    <img
                      src={profileData.profilePictureUrl}
                      alt={profileData.fullName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-theme-bg shadow-lg shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl shrink-0">
                      {(profileData.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h2 className="text-2xl font-display font-bold text-theme-text">
                      {profileData.fullName}
                    </h2>
                    <p className="text-theme-muted text-sm">
                      {profileData.email}
                      {profileData.phoneNumber ? ` • 📞 ${profileData.phoneNumber}` : ''}
                      {profileData.parentPhoneNumber
                        ? ` • 👨‍👩‍👧 Parent: ${profileData.parentPhoneNumber}`
                        : ''}
                    </p>
                    <p className="text-xs text-theme-muted">
                      {formatAcademicProfile(profileData)}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-theme-muted pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-accent-400" />
                        <strong>Registered:</strong> {formatDateTime(profileData.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary-400" />
                        <strong>Last Login:</strong> {formatDateTime(profileData.lastLoginAt)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Badge variant={profileData.isActive ? 'success' : 'error'}>
                        {profileData.isActive ? 'Active Account' : 'Suspended'}
                      </Badge>
                      <Badge variant="gold">XP: {profileData.xp || 0}</Badge>
                      <Badge variant="default">Streak: {profileData.streakDays || 0}d</Badge>
                      {profileData.deviceId ? (
                        <Badge variant="default">Device Bound</Badge>
                      ) : (
                        <Badge variant="warning">No Device</Badge>
                      )}
                      {profileData.isDemo && <Badge variant="accent">Demo Account</Badge>}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Print Complete History, Export CSV, Reset Device */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => printStudentFullHistory(profileData)}
                    icon={<Printer className="w-4 h-4" />}
                  >
                    Print Full History / PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadStudentHistoryCsv(profileData)}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!profileData.deviceId}
                    onClick={handleResetDevice}
                    icon={<Smartphone className="w-3.5 h-3.5" />}
                  >
                    Reset Device Lock
                  </Button>
                </div>
              </div>

              {/* Executive Summary Cards (From Registration to Now) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-accent-400">
                    {stats.totalCoursesTouched ?? profileData.coursesHistory?.length ?? 0}
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Courses Accessed
                  </p>
                </div>
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-theme-text">
                    {stats.totalLecturesUnlocked ?? profileData.lectures?.length ?? 0}
                    <span className="text-xs text-theme-muted font-normal ml-1">
                      ({stats.totalLecturesStarted ?? 0} started)
                    </span>
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Lectures Unlocked
                  </p>
                </div>
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-success-400">
                    {stats.totalUniqueVideosWatched ?? 0}
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Videos Watched
                  </p>
                </div>
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-gold-400">
                    {stats.totalConfirmedVideoWatches ?? 0}
                    <span className="text-xs text-theme-muted font-normal ml-1">
                      ({stats.totalVideoStreamOpens ?? 0} opens)
                    </span>
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Total Watch Count
                  </p>
                </div>
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-secondary-400">
                    {stats.totalVideosCompleted ?? 0}
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Videos Completed
                  </p>
                </div>
                <div className="glass bg-black/20 rounded-xl p-3 border border-white/[0.05] text-center">
                  <p className="text-xl font-display font-bold text-theme-text">
                    {stats.totalCodesRedeemed ?? 0} / {stats.totalQuizAttempts ?? 0}
                  </p>
                  <p className="text-[11px] text-theme-muted uppercase font-semibold">
                    Codes / Quizzes
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-theme-border pb-3">
                {[
                  { id: 'ALL', label: 'Full Dossier (All)', icon: Layers },
                  { id: 'COURSES_VIDEOS', label: 'Courses, Lectures & Videos', icon: BookOpen },
                  { id: 'VIDEO_LOG', label: 'Video Watch Counts & Limits', icon: Video },
                  { id: 'QUIZZES_EXAMS', label: 'Quizzes & Exams', icon: ShieldAlert },
                  { id: 'CODES_ACCESS', label: 'Codes & Unlocks', icon: KeyRound },
                  { id: 'DEVICES', label: 'Devices & Logins', icon: Smartphone },
                  { id: 'TIMELINE', label: 'Timeline (Reg → Now)', icon: Activity },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-accent-500 text-white shadow-sm'
                          : 'bg-white/[0.03] text-theme-muted hover:text-theme-text hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* SECTION: Complete Hierarchical Courses, Lectures & Videos Breakdown */}
              {(activeTab === 'ALL' || activeTab === 'COURSES_VIDEOS') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-accent-400" /> Complete Courses, Lectures & Video Watch Breakdown
                    </h3>
                    <span className="text-xs text-theme-muted">
                      {profileData.coursesHistory?.length || 0} Course(s)
                    </span>
                  </div>

                  {profileData.coursesHistory?.length > 0 ? (
                    <div className="space-y-4">
                      {profileData.coursesHistory.map((course: any) => {
                        const isExpanded = expandedCourses[course.courseId] !== false;
                        return (
                          <div
                            key={course.courseId}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.01] overflow-hidden"
                          >
                            {/* Course Header */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCourses((prev) => ({
                                  ...prev,
                                  [course.courseId]: !isExpanded,
                                }))
                              }
                              className="w-full p-4 bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-accent-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-theme-muted shrink-0" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-theme-text text-base">
                                      {course.courseTitle}
                                    </span>
                                    {course.isFree ? (
                                      <Badge variant="success">Free Course</Badge>
                                    ) : course.hasDirectCourseAccess ? (
                                      <Badge variant={course.isExpired ? 'error' : 'accent'}>
                                        {course.isExpired
                                          ? 'Full Course Access (Expired)'
                                          : 'Full Course Access'}
                                      </Badge>
                                    ) : (
                                      <Badge variant="default">Lecture Access</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-theme-muted mt-0.5">
                                    {course.unlockedAt
                                      ? `Unlocked: ${formatDateTime(course.unlockedAt)} • `
                                      : ''}
                                    {course.expiresAt
                                      ? `Expires: ${formatDateTime(course.expiresAt)}`
                                      : 'No Course Expiry'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <Badge variant="default">
                                  Lectures: {course.unlockedLecturesCount}/{course.totalLecturesCount}
                                </Badge>
                                <Badge variant="success">
                                  Videos Watched: {course.watchedVideosCount}/{course.totalVideosCount}
                                </Badge>
                                <Badge variant="gold">
                                  Total Watches: {course.totalVideoWatchesCount} ({course.totalStreamOpensCount} opens)
                                </Badge>
                              </div>
                            </button>

                            {/* Lectures inside Course */}
                            {isExpanded && (
                              <div className="p-4 space-y-4 divide-y divide-white/[0.06]">
                                {course.lectures?.map((lec: any) => (
                                  <div key={lec.lectureId} className="pt-4 first:pt-0 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-theme-text text-sm">
                                            {lec.lectureTitle}
                                          </span>
                                          {lec.chapterTitle && (
                                            <span className="text-xs text-theme-muted">
                                              ({lec.chapterTitle})
                                            </span>
                                          )}
                                          <Badge
                                            variant={
                                              !lec.isUnlocked
                                                ? 'default'
                                                : lec.isExpired
                                                  ? 'error'
                                                  : lec.isStarted
                                                    ? 'success'
                                                    : 'warning'
                                            }
                                          >
                                            {!lec.isUnlocked
                                              ? 'Not Unlocked'
                                              : lec.isExpired
                                                ? 'Expired'
                                                : lec.isStarted
                                                  ? 'Started & Active'
                                                  : 'Unlocked (Not Started)'}
                                          </Badge>
                                          <Badge variant="default">
                                            Limit:{' '}
                                            {lec.maxViews !== null
                                              ? `${lec.maxViews} views/video`
                                              : 'Unlimited'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-theme-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                          <span>
                                            <strong>Unlocked:</strong> {formatDateTime(lec.unlockedAt)}
                                          </span>
                                          <span>
                                            <strong>Started:</strong> {formatDateTime(lec.activatedAt)}
                                          </span>
                                          <span>
                                            <strong>Expires:</strong> {formatDateTime(lec.expiresAt)}
                                          </span>
                                          {lec.codesUsed?.length > 0 && (
                                            <span>
                                              <strong>Code(s):</strong>{' '}
                                              {lec.codesUsed.map((c: any) => c.code).join(', ')}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-xs text-theme-muted shrink-0">
                                        Watched{' '}
                                        <strong className="text-theme-text">
                                          {lec.watchedVideosCount}/{lec.totalVideosCount}
                                        </strong>{' '}
                                        videos •{' '}
                                        <strong className="text-accent-400">
                                          {lec.totalWatchesCount}
                                        </strong>{' '}
                                        watches
                                      </div>
                                    </div>

                                    {/* Videos Table inside Lecture */}
                                    {lec.videos?.length > 0 ? (
                                      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-white/[0.03] text-theme-muted border-b border-white/[0.06]">
                                              <th className="p-2.5 text-left">Video / Session</th>
                                              <th className="p-2.5 text-center">Duration</th>
                                              <th className="p-2.5 text-center">Confirmed Watches</th>
                                              <th className="p-2.5 text-center">Stream Opens</th>
                                              <th className="p-2.5 text-center">Limit & Allowance</th>
                                              <th className="p-2.5 text-center">Status</th>
                                              <th className="p-2.5 text-left">First / Last Watched</th>
                                              <th className="p-2.5 text-right">Actions / Logs</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white/[0.04]">
                                            {lec.videos.map((v: any) => {
                                              const showLogs = !!expandedVideoLogs[v.sessionId];
                                              return (
                                                <Fragment key={v.sessionId}>
                                                  <tr
                                                    className={`hover:bg-white/[0.02] ${v.isWatched ? 'bg-success-500/[0.03]' : ''}`}
                                                  >
                                                    <td className="p-2.5 font-medium text-theme-text">
                                                      <div className="flex items-center gap-1.5">
                                                        <PlayCircle
                                                          className={`w-3.5 h-3.5 shrink-0 ${v.isWatched ? 'text-success-400' : 'text-theme-muted'}`}
                                                        />
                                                        <span>{v.sessionTitle}</span>
                                                      </div>
                                                    </td>
                                                    <td className="p-2.5 text-center text-theme-muted">
                                                      {formatDuration(v.duration)}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                      <span
                                                        className={`font-bold text-sm ${v.watchCount > 0 ? 'text-accent-400' : 'text-theme-muted'}`}
                                                      >
                                                        {v.watchCount ?? v.usedViews ?? 0}x
                                                      </span>
                                                    </td>
                                                    <td className="p-2.5 text-center text-theme-muted">
                                                      {v.streamOpensCount ?? 0}x
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                      {v.maxViews !== null ? (
                                                        <span className="text-theme-text">
                                                          {v.usedViews}/{v.effectiveMaxViews}
                                                          {v.grantedViews > 0 && (
                                                            <span className="text-gold-400 ml-1">
                                                              (+{v.grantedViews} granted)
                                                            </span>
                                                          )}
                                                          <span className="block text-[10px] text-theme-muted">
                                                            {v.remainingViews} remaining
                                                          </span>
                                                        </span>
                                                      ) : (
                                                        <span className="text-theme-muted">
                                                          Unlimited
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                      {v.isCompleted ? (
                                                        <Badge variant="success">Completed</Badge>
                                                      ) : v.isWatched ? (
                                                        <Badge variant="accent">Watched</Badge>
                                                      ) : (
                                                        <Badge variant="default">Not Watched</Badge>
                                                      )}
                                                    </td>
                                                    <td className="p-2.5 text-[11px] text-theme-muted">
                                                      <div>
                                                        <strong>First:</strong>{' '}
                                                        {formatDateTime(v.firstWatchedAt)}
                                                      </div>
                                                      <div>
                                                        <strong>Last:</strong>{' '}
                                                        {formatDateTime(v.lastWatchedAt)}
                                                      </div>
                                                      {v.isCompleted && v.completedAt && (
                                                        <div className="text-success-400">
                                                          <strong>Done:</strong>{' '}
                                                          {formatDateTime(v.completedAt)}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                      <div className="flex items-center justify-end gap-1.5">
                                                        {v.playbackLogs?.length > 0 && (
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              setExpandedVideoLogs((prev) => ({
                                                                ...prev,
                                                                [v.sessionId]: !prev[v.sessionId],
                                                              }))
                                                            }
                                                            className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-theme-text"
                                                          >
                                                            {showLogs
                                                              ? 'Hide Timestamps'
                                                              : `Timestamps (${v.playbackLogs.length})`}
                                                          </button>
                                                        )}
                                                        {v.maxViews !== null && v.usedViews > 0 && (
                                                          <button
                                                            type="button"
                                                            onClick={() => handleGrantViews(v)}
                                                            className="px-2 py-1 rounded bg-accent-500/20 hover:bg-accent-500/30 text-[11px] text-accent-300 font-semibold"
                                                            title="Grant additional views"
                                                          >
                                                            + Grant Views
                                                          </button>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                  {showLogs && v.playbackLogs?.length > 0 && (
                                                    <tr className="bg-black/30">
                                                      <td colSpan={8} className="p-3">
                                                        <p className="text-[11px] font-bold text-theme-muted uppercase mb-1.5">
                                                          Exact Watch Session Timestamps for "{v.sessionTitle}":
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                          {v.playbackLogs.map((log: any) => (
                                                            <div
                                                              key={log.id}
                                                              className="p-2 rounded bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-[11px]"
                                                            >
                                                              <span>
                                                                <strong>#{log.index}:</strong>{' '}
                                                                {formatDateTime(log.openedAt)}
                                                              </span>
                                                              <Badge
                                                                variant={
                                                                  log.consumed ? 'success' : 'default'
                                                                }
                                                              >
                                                                {log.consumed
                                                                  ? 'View Consumed'
                                                                  : 'Stream Opened'}
                                                              </Badge>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-theme-muted italic">
                                        No videos in this lecture.
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-theme-muted">
                      No courses or lectures accessed by this student yet.
                    </p>
                  )}
                </div>
              )}

              {/* SECTION: Video View Limits & All Watched Videos */}
              {(activeTab === 'ALL' || activeTab === 'VIDEO_LOG') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Video className="w-4 h-4 text-accent-400" /> Video View Limits & Allowance Controls
                    </h3>
                    {profileData.sessionViews?.filter((sv: any) => sv.maxViews !== null)?.length >
                    0 ? (
                      <div className="space-y-3">
                        {profileData.sessionViews
                          .filter((sv: any) => sv.maxViews !== null)
                          .map((sv: any) => {
                            const remaining = Math.max(0, sv.effectiveMaxViews - sv.usedViews);
                            const isExhausted = remaining === 0;

                            return (
                              <div
                                key={sv.sessionId}
                                className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col gap-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm text-theme-text font-medium">
                                      {sv.sessionTitle}
                                    </p>
                                    <p className="text-xs text-theme-muted">
                                      {sv.lectureTitle} • {sv.courseTitle}
                                    </p>
                                  </div>
                                  <Badge variant={isExhausted ? 'error' : 'success'}>
                                    {remaining} Remaining
                                  </Badge>
                                </div>

                                <div className="flex justify-between items-end mt-2">
                                  <div className="text-xs text-theme-muted space-y-1">
                                    <p>
                                      Used (Confirmed Watches):{' '}
                                      <span className="text-theme-text font-medium">
                                        {sv.usedViews}
                                      </span>{' '}
                                      ({sv.streamOpensCount ?? sv.usedViews} stream opens)
                                    </p>
                                    <p>
                                      Original Limit:{' '}
                                      <span className="text-theme-text font-medium">
                                        {sv.maxViews}
                                      </span>
                                    </p>
                                    <p>
                                      Previously Granted:{' '}
                                      <span className="text-theme-text font-medium">
                                        {sv.grantedViews}
                                      </span>
                                    </p>
                                    <p>
                                      Effective Limit:{' '}
                                      <span className="text-theme-text font-medium">
                                        {sv.effectiveMaxViews}
                                      </span>
                                    </p>
                                    <p>
                                      First Watched:{' '}
                                      <span className="text-theme-text">
                                        {formatDateTime(sv.firstWatchedAt)}
                                      </span>{' '}
                                      • Last Watched:{' '}
                                      <span className="text-theme-text">
                                        {formatDateTime(sv.lastWatchedAt)}
                                      </span>
                                    </p>
                                  </div>

                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleGrantViews(sv)}
                                  >
                                    Grant Views
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm text-theme-muted">No limited videos accessed yet.</p>
                    )}
                  </div>

                  {/* All Watched Videos Summary */}
                  <div className="pt-4 border-t border-white/[0.06]">
                    <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3">
                      All Watched / Opened Videos ({profileData.allVideosWatched?.length || 0})
                    </h4>
                    {profileData.allVideosWatched?.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-white/[0.03] text-theme-muted border-b border-white/[0.06]">
                              <th className="p-2.5 text-left">Video</th>
                              <th className="p-2.5 text-left">Course / Lecture</th>
                              <th className="p-2.5 text-center">Confirmed Watches</th>
                              <th className="p-2.5 text-center">Stream Opens</th>
                              <th className="p-2.5 text-center">Completed</th>
                              <th className="p-2.5 text-left">First / Last Watched</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {profileData.allVideosWatched.map((v: any) => (
                              <tr key={v.sessionId} className="hover:bg-white/[0.02]">
                                <td className="p-2.5 font-semibold text-theme-text">
                                  {v.sessionTitle}
                                </td>
                                <td className="p-2.5 text-theme-muted">
                                  <div>{v.courseTitle}</div>
                                  <div className="text-[11px]">{v.lectureTitle}</div>
                                </td>
                                <td className="p-2.5 text-center font-bold text-accent-400">
                                  {v.watchCount ?? v.usedViews ?? 0}x
                                </td>
                                <td className="p-2.5 text-center text-theme-muted">
                                  {v.streamOpensCount ?? 0}x
                                </td>
                                <td className="p-2.5 text-center">
                                  {v.isCompleted ? (
                                    <Badge variant="success">
                                      Yes ({formatDateTime(v.completedAt)})
                                    </Badge>
                                  ) : (
                                    <Badge variant="default">No</Badge>
                                  )}
                                </td>
                                <td className="p-2.5 text-[11px] text-theme-muted">
                                  <div>First: {formatDateTime(v.firstWatchedAt)}</div>
                                  <div>Last: {formatDateTime(v.lastWatchedAt)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-theme-muted">No videos watched yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: Activation Codes & Unlocks */}
              {(activeTab === 'ALL' || activeTab === 'CODES_ACCESS') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-4">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-gold-400" /> Redeemed Activation Codes & Access History
                  </h3>
                  {profileData.redeemedCodes?.length > 0 || profileData.codeHistory?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.03] text-theme-muted border-b border-white/[0.06]">
                            <th className="p-2.5 text-left">Code</th>
                            <th className="p-2.5 text-left">Action / Status</th>
                            <th className="p-2.5 text-left">Course</th>
                            <th className="p-2.5 text-left">Lecture / File</th>
                            <th className="p-2.5 text-left">Date & Time</th>
                            <th className="p-2.5 text-left">IP / Browser</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {(profileData.codeHistory?.length > 0
                            ? profileData.codeHistory
                            : profileData.redeemedCodes
                          ).map((c: any) => (
                            <tr key={c.id} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-mono font-bold text-gold-300">{c.code}</td>
                              <td className="p-2.5">
                                <Badge variant="success">
                                  {c.action || c.status || 'REDEEMED'}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-theme-text">{c.courseTitle || '—'}</td>
                              <td className="p-2.5 text-theme-muted">
                                {c.lectureTitle || c.attachmentTitle || '—'}
                              </td>
                              <td className="p-2.5 text-theme-muted">
                                {formatDateTime(c.createdAt || c.redeemedAt)}
                              </td>
                              <td className="p-2.5 text-theme-muted text-[11px]">
                                {[c.ipAddress, c.browser].filter(Boolean).join(' • ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-theme-muted">No activation codes redeemed yet.</p>
                  )}
                </div>
              )}

              {/* SECTION: Quiz & Exam Attempts */}
              {(activeTab === 'ALL' || activeTab === 'QUIZZES_EXAMS') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-4">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-secondary-400" /> Quiz & Exam Attempts ({(profileData.quizAttempts?.length || 0) + (profileData.examAttempts?.length || 0)})
                  </h3>
                  {profileData.quizAttempts?.length > 0 || profileData.examAttempts?.length > 0 ? (
                    <div className="space-y-2">
                      {profileData.quizAttempts?.map((attempt: any, idx: number) => (
                        <div
                          key={attempt.attemptId || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
                        >
                          <div className="min-w-0">
                            <p className="text-theme-text font-medium truncate">
                              [Quiz] {attempt.quizTitle || 'Quiz'}
                            </p>
                            <p className="text-xs text-theme-muted">
                              {[attempt.courseTitle, attempt.lectureTitle]
                                .filter(Boolean)
                                .join(' • ')}{' '}
                              • {formatDateTime(attempt.submittedAt || attempt.startedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                attempt.status === 'PASSED'
                                  ? 'success'
                                  : attempt.status === 'FAILED'
                                    ? 'error'
                                    : 'default'
                              }
                            >
                              {attempt.earnedPoints != null &&
                              attempt.totalPoints != null &&
                              attempt.totalPoints > 0
                                ? `${attempt.earnedPoints}/${attempt.totalPoints} (${attempt.score}%)`
                                : `${attempt.score}%`}{' '}
                              • {attempt.status}
                            </Badge>
                            {attempt.attemptId && (
                              <button
                                onClick={() => setReviewAttemptId(attempt.attemptId)}
                                className="p-1.5 rounded hover:bg-accent-500/10 text-theme-muted hover:text-accent-400 transition-colors"
                                title="Review attempt"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {profileData.examAttempts?.map((attempt: any, idx: number) => (
                        <div
                          key={attempt.attemptId || `exam_${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
                        >
                          <div className="min-w-0">
                            <p className="text-theme-text font-medium truncate">
                              [Exam] {attempt.examTitle || 'Exam'}
                            </p>
                            <p className="text-xs text-theme-muted">
                              {[attempt.courseTitle, attempt.lectureTitle]
                                .filter(Boolean)
                                .join(' • ')}{' '}
                              • {formatDateTime(attempt.submittedAt || attempt.startedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                attempt.status === 'PASSED'
                                  ? 'success'
                                  : attempt.status === 'FAILED'
                                    ? 'error'
                                    : 'default'
                              }
                            >
                              {attempt.earnedPoints != null &&
                              attempt.totalPoints != null &&
                              attempt.totalPoints > 0
                                ? `${attempt.earnedPoints}/${attempt.totalPoints} (${attempt.score ?? 0}%)`
                                : `${attempt.score ?? 0}%`}{' '}
                              • {attempt.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-theme-muted">No quiz or exam attempts yet.</p>
                  )}
                </div>
              )}

              {/* SECTION: Devices & Login Security History */}
              {(activeTab === 'ALL' || activeTab === 'DEVICES') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-4">
                  <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-accent-400" /> Device Binding & Security History
                  </h3>
                  {profileData.deviceHistory?.length > 0 ||
                  profileData.deviceSessions?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.03] text-theme-muted border-b border-white/[0.06]">
                            <th className="p-2.5 text-left">Action</th>
                            <th className="p-2.5 text-left">Device Fingerprint</th>
                            <th className="p-2.5 text-left">IP Address</th>
                            <th className="p-2.5 text-left">Browser</th>
                            <th className="p-2.5 text-left">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {profileData.deviceHistory?.map((dh: any) => (
                            <tr key={dh.id} className="hover:bg-white/[0.02]">
                              <td className="p-2.5">
                                <Badge
                                  variant={
                                    dh.action === 'RESET'
                                      ? 'warning'
                                      : dh.action === 'REGISTERED'
                                        ? 'success'
                                        : 'default'
                                  }
                                >
                                  {dh.action}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-mono text-theme-text">
                                {dh.deviceFingerprint}
                              </td>
                              <td className="p-2.5 text-theme-muted">{dh.ipAddress || '—'}</td>
                              <td className="p-2.5 text-theme-muted max-w-xs truncate" title={dh.browser}>
                                {dh.browser || '—'}
                              </td>
                              <td className="p-2.5 text-theme-muted">
                                {formatDateTime(dh.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-theme-muted">No device history recorded yet.</p>
                  )}
                </div>
              )}

              {/* SECTION: Complete Chronological Timeline (Registration to Now) */}
              {(activeTab === 'ALL' || activeTab === 'TIMELINE') && (
                <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent-400" /> Complete Chronological Evidence Timeline (Registration → Now)
                    </h3>
                    <select
                      value={timelineFilter}
                      onChange={(e) => setTimelineFilter(e.target.value)}
                      className="bg-theme-card border border-theme-border rounded-lg px-2.5 py-1 text-xs text-theme-text"
                    >
                      <option value="ALL">All Events ({profileData.timeline?.length || 0})</option>
                      <option value="REGISTRATION">Registration</option>
                      <option value="COURSE_ACCESS">Course Access</option>
                      <option value="LECTURE_ACCESS">Lecture Access</option>
                      <option value="CODE_REDEMPTION">Code Redemptions</option>
                      <option value="VIDEO_WATCH">Video Watches</option>
                      <option value="VIDEO_COMPLETE">Video Completions</option>
                      <option value="QUIZ_ATTEMPT">Quiz Attempts</option>
                      <option value="EXAM_ATTEMPT">Exam Attempts</option>
                      <option value="DEVICE_EVENT">Device Events</option>
                      <option value="ADMIN_ACTION">Admin Actions</option>
                    </select>
                  </div>

                  {filteredTimeline.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-lg border border-white/[0.06]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-base-900 z-10">
                          <tr className="text-theme-muted border-b border-white/[0.06]">
                            <th className="p-2.5 text-left w-10">#</th>
                            <th className="p-2.5 text-left w-44">Date & Time</th>
                            <th className="p-2.5 text-left w-32">Category</th>
                            <th className="p-2.5 text-left">Event</th>
                            <th className="p-2.5 text-left">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredTimeline.map((ev: any, idx: number) => (
                            <tr key={ev.id || idx} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 text-theme-muted">{idx + 1}</td>
                              <td className="p-2.5 font-mono text-theme-text whitespace-nowrap">
                                {formatDateTime(ev.timestamp)}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="default">{ev.category}</Badge>
                              </td>
                              <td className="p-2.5 font-semibold text-theme-text">{ev.title}</td>
                              <td className="p-2.5 text-theme-muted">{ev.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-theme-muted">No timeline events found.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {reviewAttemptId && (
        <QuizAttemptReviewModal
          attemptId={reviewAttemptId}
          onClose={() => setReviewAttemptId(null)}
        />
      )}
    </div>
  );
}
