import React, { useState } from 'react';
import {
  ShieldAlert,
  Laptop,
  Smartphone,
  Tablet,
  AlertOctagon,
  HelpCircle,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { DeviceInfo } from '../lib/auth';
import { getClientDeviceDetails } from '../lib/device';

interface Props {
  email?: string;
  registeredDevice?: DeviceInfo | null;
  currentDevice?: DeviceInfo | null;
}

export function UnrecognizedDeviceAlert({ email, registeredDevice, currentDevice }: Props) {
  const [activeLang, setActiveLang] = useState<'ar' | 'en'>('ar');

  const supportNumber = '201064763583';
  const displayPhone = '01064763583';

  // Fallback to client-detected device info if not returned by backend
  const clientFallback = getClientDeviceDetails();
  const effectiveCurrent: DeviceInfo = currentDevice || {
    deviceType: clientFallback.deviceType,
    nameAr: clientFallback.nameAr,
    nameEn: clientFallback.nameEn,
    os: clientFallback.os,
    browser: clientFallback.browser,
    category: clientFallback.category,
  };

  const registeredNameAr = registeredDevice?.nameAr || registeredDevice?.deviceType || 'الجهاز المسجل مسبقاً (جهازك الأساسي)';
  const registeredNameEn = registeredDevice?.nameEn || registeredDevice?.deviceType || 'Previously Authorized Device';

  const currentNameAr = effectiveCurrent.nameAr || effectiveCurrent.deviceType || 'جهاز مختلف';
  const currentNameEn = effectiveCurrent.nameEn || effectiveCurrent.deviceType || 'Different Device';

  const waMessageAr = `مرحباً، أواجه مشكلة في تسجيل الدخول على منصة E.Camp (تم حظر الدخول لأن الحساب مقيد بجهاز آخر).
البريد الإلكتروني: ${email || 'غير محدد'}
الجهاز المسجل أصلاً: ${registeredNameAr}
الجهاز الحالي المستخدم: ${currentNameAr}
أرجو المساعدة في إعادة ضبط الجهاز المصرح به لحسابي.`;

  const waMessageEn = `Hello E.Camp Support,
I am unable to sign in because my account is bound to another device.
Registered Email: ${email || 'Not specified'}
Registered Device: ${registeredNameEn}
Current Device: ${currentNameEn}
Please assist with a device reset for my account.`;

  const currentWaMessage = activeLang === 'ar' ? waMessageAr : waMessageEn;
  const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(currentWaMessage)}`;

  const formatRegisteredDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return activeLang === 'ar'
        ? d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const registeredDateFormatted = formatRegisteredDate(registeredDevice?.date);

  const renderDeviceIcon = (category?: string, className = 'w-5 h-5') => {
    if (category === 'mobile') return <Smartphone className={className} />;
    if (category === 'tablet') return <Tablet className={className} />;
    return <Laptop className={className} />;
  };

  return (
    <div
      dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
      className="mb-6 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-theme-card/90 to-theme-card/95 p-4 sm:p-5 shadow-xl shadow-rose-950/20 backdrop-blur-md transition-all text-theme-text"
    >
      {/* ── Top Bar: Icon + Title + Language Switcher ── */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-rose-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activeLang === 'ar' ? 'سياسة الجهاز الواحد' : 'Single-Device Policy'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-theme-text mt-0.5">
              {activeLang === 'ar' ? 'تم تقييد تسجيل الدخول (جهاز غير مصرّح به)' : 'Access Restricted (Unrecognized Device)'}
            </h3>
          </div>
        </div>

        {/* In-Card Language Toggle */}
        <div className="flex items-center p-1 rounded-lg bg-theme-bg/80 border border-theme-border text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveLang('ar')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeLang === 'ar'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shadow-sm'
                : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            عربي
          </button>
          <button
            type="button"
            onClick={() => setActiveLang('en')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeLang === 'en'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shadow-sm'
                : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* ── Visual Device Comparison: Registered vs. Current ── */}
      <div className="mb-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted mb-2 flex items-center gap-1.5">
          <span>{activeLang === 'ar' ? 'مقارنة الأجهزة المكتشفة' : 'Detected Device Comparison'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Initial / Registered Device Card */}
          <div className="relative p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {activeLang === 'ar' ? 'الجهاز الأصلي المسجل' : 'Initial Registered Device'}
                </span>
                {registeredDateFormatted && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80">
                    <Clock className="w-3 h-3" />
                    {registeredDateFormatted}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  {renderDeviceIcon(registeredDevice?.category)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-theme-text truncate">
                    {activeLang === 'ar' ? registeredNameAr : registeredNameEn}
                  </p>
                  <p className="text-[11px] text-theme-muted truncate">
                    {[registeredDevice?.os, registeredDevice?.browser].filter(Boolean).join(' • ') ||
                      (activeLang === 'ar' ? 'جهازك المصرح به مسبقاً' : 'Your authorized device')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-emerald-500/15 text-[11px] text-emerald-300/90 font-medium flex items-center gap-1">
              <span>{activeLang === 'ar' ? '✓ مسموح بالدخول من هذا الجهاز فقط' : '✓ Access is allowed from this device only'}</span>
            </div>
          </div>

          {/* 2. Current Device Card */}
          <div className="relative p-3 rounded-xl border border-rose-500/35 bg-rose-950/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" />
                  {activeLang === 'ar' ? 'الجهاز الحالي (المحاولة الآن)' : 'Current Device (Attempted Now)'}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {activeLang === 'ar' ? 'محظور' : 'Blocked'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                  {renderDeviceIcon(effectiveCurrent.category)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-theme-text truncate">
                    {activeLang === 'ar' ? currentNameAr : currentNameEn}
                  </p>
                  <p className="text-[11px] text-theme-muted truncate">
                    {[effectiveCurrent.os, effectiveCurrent.browser].filter(Boolean).join(' • ') ||
                      (activeLang === 'ar' ? 'جهازك الحالي غير مطابق' : 'Current device does not match')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-rose-500/15 text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <span>{activeLang === 'ar' ? '✕ تم رفض الدخول لأن البصمة لا تطابق الجهاز المسجل' : '✕ Access rejected: Hardware fingerprint mismatch'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Explanatory Details ── */}
      <div className="space-y-2.5 text-xs sm:text-sm">
        {/* Why this happened */}
        <div className="p-3 rounded-xl bg-theme-bg/60 border border-white/5 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-theme-text">
                {activeLang === 'ar'
                  ? 'لماذا ظهرت هذه الرسالة؟'
                  : 'Why was this access restricted?'}
              </p>
              <p className="text-theme-muted leading-relaxed mt-0.5">
                {activeLang === 'ar' ? (
                  <>
                    حسابك مسجل ومعتمد على جهاز <strong className="text-emerald-300">{registeredNameAr}</strong>. بينما تحاول الآن تسجيل الدخول من جهاز <strong className="text-rose-300">{currentNameAr}</strong>. تنص شروط المنصة على تقييد الحساب بجهاز واحد فقط لحماية المحتوى ومنع مشاركة الحسابات.
                  </>
                ) : (
                  <>
                    Your account is registered to <strong className="text-emerald-300">{registeredNameEn}</strong>. The current attempt originated from <strong className="text-rose-300">{currentNameEn}</strong>. Platform policy strictly binds each student account to one single authorized device.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* What to do next */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                {activeLang === 'ar' ? 'ماذا يجب أن تفعل الآن؟' : 'How to Resolve This:'}
              </p>
              <ul className="text-theme-muted space-y-1 leading-relaxed list-disc list-inside">
                {activeLang === 'ar' ? (
                  <>
                    <li>
                      <span className="text-theme-text font-medium">إذا كان جهازك الأصلي متاحاً:</span> يرجى تسجيل الدخول مباشرة من <strong className="text-emerald-300">{registeredNameAr}</strong>.
                    </li>
                    <li>
                      <span className="text-theme-text font-medium">إذا قمت بتغيير جهازك أو عمل فورمات:</span> تواصل مع الدعم الفني بالأسفل واطلب <strong className="text-amber-300">إعادة تعيين الجهاز (Device Reset)</strong>.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <span className="text-theme-text font-medium">If your original device is available:</span> Please log in from <strong className="text-emerald-300">{registeredNameEn}</strong>.
                    </li>
                    <li>
                      <span className="text-theme-text font-medium">If you replaced or reset your device:</span> Contact support below to verify your identity and request an official <strong className="text-amber-300">Device Reset</strong>.
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-4 pt-3 border-t border-rose-500/20 flex flex-col sm:flex-row gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-lg shadow-emerald-950/30 transition-all"
        >
          <MessageSquare className="w-4 h-4 fill-white" />
          <span>
            {activeLang === 'ar'
              ? 'تواصل مع الدعم الفني عبر واتساب'
              : 'Contact Support on WhatsApp'}
          </span>
        </a>

        <a
          href={`tel:+${supportNumber}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-theme-bg/80 hover:bg-theme-bg border border-theme-border text-theme-text transition-colors"
        >
          <Phone className="w-4 h-4 text-theme-muted" />
          <span dir="ltr">{displayPhone}</span>
        </a>
      </div>

      {/* ── Security Footnote ── */}
      <p className="mt-3 text-[11px] text-center text-theme-muted/70 leading-normal">
        {activeLang === 'ar'
          ? '🔒 تنبيه أمني: يمنع منعاً باتاً مشاركة بيانات الحساب مع الآخرين. يتم تسجيل وتوثيق جميع محاولات الدخول المخالفة لحماية حقوقك.'
          : '🔒 Security notice: Account sharing is strictly prohibited. All unauthorized login attempts are logged and monitored to protect account security.'}
      </p>
    </div>
  );
}
