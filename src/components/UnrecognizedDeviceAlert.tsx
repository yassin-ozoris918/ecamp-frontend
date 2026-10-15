import React, { useState } from 'react';
import { ShieldAlert, Laptop, AlertOctagon, HelpCircle, Phone, MessageSquare, Globe } from 'lucide-react';

interface Props {
  email?: string;
}

export function UnrecognizedDeviceAlert({ email }: Props) {
  const [activeLang, setActiveLang] = useState<'ar' | 'en'>('ar');

  const supportNumber = '201064763583';
  const displayPhone = '01064763583';

  const waMessageAr = `مرحباً، أواجه مشكلة في تسجيل الدخول على منصة E.Camp (تم حظر الدخول لأن الحساب مقيد بجهاز آخر).
البريد الإلكتروني: ${email || 'غير محدد'}
أرجو المساعدة في إعادة ضبط الجهاز المصرح به لحسابي.`;

  const waMessageEn = `Hello E.Camp Support,
I am unable to sign in because my account is bound to another device.
Registered Email: ${email || 'Not specified'}
Please assist with a device reset for my account.`;

  const currentWaMessage = activeLang === 'ar' ? waMessageAr : waMessageEn;
  const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(currentWaMessage)}`;

  return (
    <div
      dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
      className="mb-6 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-theme-card/90 to-theme-card/95 p-4 sm:p-5 shadow-xl shadow-rose-950/20 backdrop-blur-md transition-all text-theme-text"
    >
      {/* ── Top Bar: Icon + Title + Language Switcher ── */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-rose-500/20">
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

      {/* ── Explanatory Cards ── */}
      <div className="space-y-2.5 text-xs sm:text-sm">
        {/* Why this happened */}
        <div className="p-3 rounded-xl bg-theme-bg/60 border border-white/5 space-y-2">
          <div className="flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-theme-text">
                {activeLang === 'ar'
                  ? 'حسابك مقيّد بجهازك المسجل مسبقاً'
                  : 'Account Bound to a Single Authorized Device'}
              </p>
              <p className="text-theme-muted leading-relaxed mt-0.5">
                {activeLang === 'ar'
                  ? 'لقد قمت مسبقاً بتسجيل الدخول وتثبيت حسابك على جهاز محدد (كمبيوتر أو هاتف). لضمان حماية الحسابات ومنع مشاركتها، تنص سياسة المنصة على السماح بالدخول من جهاز معتمد واحد فقط.'
                  : 'Your account was previously activated and bound to your primary device. To safeguard your account and protect educational content, platform policy strictly restricts each student account to one single authorized device.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
            <AlertOctagon className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-theme-text">
                {activeLang === 'ar'
                  ? 'المحاولة الحالية تتم من جهاز أو متصفح مختلف'
                  : 'Current Attempt Detected from a Different Device'}
              </p>
              <p className="text-theme-muted leading-relaxed mt-0.5">
                {activeLang === 'ar'
                  ? 'محاولة الدخول الحالية تتم من جهاز أو متصفح لا يطابق بصمة جهازك المعتمد، ولذلك تم حظر الدخول تلقائياً.'
                  : 'This login attempt was initiated from a different physical device or browser profile that does not match your registered device, so access was automatically blocked.'}
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
                      <span className="text-theme-text font-medium">إذا كان جهازك السابق متاحاً:</span> يرجى تسجيل الدخول منه مباشرة لمتابعة دراستك.
                    </li>
                    <li>
                      <span className="text-theme-text font-medium">إذا قمت بتغيير الجهاز أو عمل فورمات:</span> يرجى التواصل فوراً مع الدعم الفني لطلب <strong className="text-amber-300">إعادة تعيين الجهاز (Device Reset)</strong> بعد التحقق من هويتك.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <span className="text-theme-text font-medium">If you still have your original device:</span> Please sign in from that device to continue your classes.
                    </li>
                    <li>
                      <span className="text-theme-text font-medium">If you replaced or formatted your device:</span> Contact technical support to verify your account and request an official <strong className="text-amber-300">Device Reset</strong>.
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
