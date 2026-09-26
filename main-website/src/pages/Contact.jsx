import { useEffect, useRef, useState } from 'react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --accent: #b8cc8a;
    --accent-dim: #8fa660;
    --accent-glow: rgba(184, 204, 138, 0.08);
    --accent-bg: rgba(184, 204, 138, 0.12);
    --accent-border: rgba(184, 204, 138, 0.22);
    --bg: #0a0a0f;
    --surface: rgba(255,255,255,0.03);
    --surface-hover: rgba(255,255,255,0.055);
    --border: rgba(255,255,255,0.07);
    --text: #ffffff;
    --text-sub: rgba(255,255,255,0.75);
    --text-dim: rgba(255,255,255,0.45);
  }

  .c-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .c-root { font-family: 'Montserrat', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  /* HERO */
  .c-hero {
    position: relative; z-index: 1;
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: clamp(80px,12vw,120px) clamp(16px,4vw,24px);
    background: #0a0d0f;
  }
  .c-hero::before {
    content: ''; position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 55% at 50% 40%, rgba(184,204,138,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .c-hero-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 80px 80px;
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at center, black 30%, transparent 80%);
    mask-image: radial-gradient(ellipse 80% 80% at center, black 30%, transparent 80%);
  }

  .c-badge {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--accent); border: 1px solid var(--accent-border);
    padding: 5px 14px; border-radius: 20px; margin-bottom: 24px;
    background: var(--accent-glow);
  }
  .c-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
    animation: pdot 2s ease-in-out infinite;
  }
  @keyframes pdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }

  .c-hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(64px,10vw,120px);
    font-weight: 300; line-height: 1.02; letter-spacing: 0.01em;
  }
  .c-hero-title em { color: transparent; font-style: normal; -webkit-text-stroke: 1px #b8cc8a; }
  .c-char {
    display: inline-block;
    opacity: 0; transform: translateY(28px);
    animation: chin 0.5s ease forwards;
  }
  .c-char-space { display: inline-block; width: 0.28em; }
  @keyframes chin { to { opacity: 1; transform: translateY(0); } }

  .c-hero-sub {
    margin-top: 16px; font-size: 0.9rem; color: var(--text-dim); letter-spacing: 0.05em;
    opacity: 0; animation: fup 0.6s ease 1s forwards;
  }
  .c-response {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 18px;
    font-size: 0.74rem; color: var(--text-sub); letter-spacing: 0.07em;
    opacity: 0; animation: fup 0.6s ease 1.2s forwards;
  }
  .c-response-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 7px var(--accent);
    animation: pdot 2.5s ease-in-out infinite;
  }
  @keyframes fup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .c-divider {
    width: 60px; height: 1px; position: relative; z-index: 1;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    margin: 40px auto 52px;
  }

  .c-grid {
    position: relative; z-index: 1;
    max-width: 1100px; margin: 0 auto;
    padding: 0 clamp(12px,3vw,24px) 100px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  @media (max-width: 700px) {
    .c-grid { grid-template-columns: 1fr; padding: 0 12px 60px; }
    .c-span2 { grid-column: 1; }
    .c-phone-grid { grid-template-columns: 1fr; }
    .c-social-grid { grid-template-columns: 1fr; }
  }
  .c-span2 { grid-column: 1 / -1; }

  /* CARD */
  .c-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 28px 30px;
    position: relative; overflow: hidden;
    transition: border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s;
  }
  .c-card::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0; transition: opacity 0.3s;
  }
  .c-card:hover { border-color: var(--accent-border); background: var(--surface-hover); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .c-card:hover::after { opacity: 1; }

  .c-card-head { display: flex; align-items: center; gap: 11px; margin-bottom: 22px; }
  .c-card-icon {
    width: 34px; height: 34px; border-radius: 9px;
    background: var(--accent-bg); display: flex; align-items: center; justify-content: center;
    color: var(--accent); flex-shrink: 0;
  }
  .c-card-title { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; }

  /* PHONES */
  .c-phone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .c-person { cursor: default; }
  .c-pname { font-size: 0.78rem; color: var(--text-sub); margin-bottom: 5px; letter-spacing: 0.03em; }
  .c-prow { display: flex; align-items: center; gap: 7px; }
  .c-pphone { font-size: 0.93rem; color: var(--accent-dim); font-weight: 500; letter-spacing: 0.02em; text-decoration: none; }
  .c-copybtn {
    background: none; border: none; cursor: pointer; color: var(--text-dim);
    padding: 2px; display: flex; align-items: center;
    transition: color 0.2s; opacity: 0;
  }
  .c-person:hover .c-copybtn { opacity: 1; color: var(--accent); }
  .c-toast { font-size: 0.7rem; color: var(--accent); opacity: 0; transition: opacity 0.2s; pointer-events: none; }
  .c-toast.on { opacity: 1; }

  /* SOCIALS */
  .c-social-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .c-soc {
    display: flex; align-items: center; gap: 9px;
    padding: 11px 14px; border-radius: 10px;
    border: 1px solid var(--border); background: transparent;
    color: var(--text-sub); font-size: 0.83rem; font-family: 'Montserrat', sans-serif;
    text-decoration: none; transition: all 0.22s;
  }
  .c-soc:hover { border-color: var(--accent-border); color: var(--accent); background: var(--accent-glow); }
  .c-sic { width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ig { background: linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); }
  .tw { background: #000; border: 1px solid #222; }
  .yt { background: #ff0000; }
  .li { background: #0a66c2; }

  /* LOCATION / EMAIL */
  .c-loc { font-size: 0.88rem; color: var(--text-sub); line-height: 2; }
  .c-erow { display: flex; align-items: center; gap: 9px; cursor: default; }
  .c-elink { color: var(--accent); font-size: 0.95rem; text-decoration: none; font-weight: 500; letter-spacing: 0.02em; transition: opacity 0.2s; }
  .c-elink:hover { opacity: 0.75; }
  .c-ecopy { background: none; border: none; cursor: pointer; color: var(--text-dim); display: flex; align-items: center; transition: color 0.2s; opacity: 0; padding: 2px; }
  .c-erow:hover .c-ecopy { opacity: 1; color: var(--accent); }

  /* MAP */
  .c-map { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); margin-top: 4px; }
  .c-map iframe { display: block; width: 100%; height: 270px; border: none; filter: grayscale(0.25) brightness(0.85); }

  /* FAQ */
  .c-faq-list { display: flex; flex-direction: column; }
  .c-faq-item { border-bottom: 1px solid var(--border); }
  .c-faq-item:last-child { border-bottom: none; }
  .c-faq-q {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    background: none; border: none; cursor: pointer;
    color: var(--text); font-family: 'Montserrat', sans-serif; font-size: 0.87rem;
    padding: 15px 0; text-align: left; gap: 12px; transition: color 0.2s;
  }
  .c-faq-q:hover { color: var(--accent); }
  .c-faq-chev { flex-shrink: 0; color: var(--text-dim); transition: transform 0.3s, color 0.2s; }
  .c-faq-q.open .c-faq-chev { transform: rotate(180deg); color: var(--accent); }
  .c-faq-a {
    overflow: hidden; max-height: 0;
    transition: max-height 0.35s ease, padding 0.25s ease;
    font-size: 0.82rem; color: var(--text-sub); line-height: 1.8;
  }
  .c-faq-a.open { max-height: 200px; padding-bottom: 15px; }

  /* FORM */
  .c-f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 500px) { .c-f2 { grid-template-columns: 1fr; } }
  .c-fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .c-fl { font-size: 0.67rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-dim); }
  .c-fi {
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 8px; padding: 11px 13px;
    color: var(--text); font-family: 'Montserrat', sans-serif; font-size: 0.87rem;
    transition: border-color 0.2s, background 0.2s; outline: none; width: 100%;
  }
  .c-fi::placeholder { color: var(--text-dim); }
  .c-fi:focus { border-color: var(--accent-border); background: rgba(184,204,138,0.03); }
  .c-fi.err { border-color: rgba(220,100,100,0.5); }
  .c-ferr { font-size: 0.71rem; color: #d07070; }
  .c-ta { resize: vertical; min-height: 110px; }

  .c-btn {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 12px 26px; border-radius: 8px;
    background: var(--accent); color: #0d0d0d;
    font-family: 'Montserrat', sans-serif; font-size: 0.87rem; font-weight: 500;
    border: none; cursor: pointer; letter-spacing: 0.03em;
    transition: opacity 0.2s, transform 0.2s;
  }
  .c-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .c-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .c-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.18); border-top-color: #0d0d0d; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .c-success { text-align: center; padding: 36px 0; }
  .c-success-ico { width: 46px; height: 46px; border-radius: 50%; background: var(--accent-bg); border: 1px solid var(--accent-border); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--accent); }
  .c-success h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.9rem; font-weight: 300; margin-bottom: 8px; }
  .c-success h3 em { color: var(--accent); font-style: italic; }
  .c-success p { color: var(--text-sub); font-size: 0.86rem; }

  /* REVEAL */
  .c-rev { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
  .c-rev.visible { opacity: 1; transform: none; }

  /* FLOAT BTN */
  .c-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 50;
    background: var(--accent); color: #0d0d0d;
    border: none; border-radius: 50px; padding: 10px 18px;
    font-family: 'Montserrat', sans-serif; font-size: 0.8rem; font-weight: 500;
    cursor: pointer; display: flex; align-items: center; gap: 7px;
    box-shadow: 0 4px 20px rgba(184,204,138,0.22);
    transition: opacity 0.3s, transform 0.3s;
    opacity: 0; pointer-events: none; transform: translateY(10px);
  }
  .c-fab.on { opacity: 1; pointer-events: auto; transform: translateY(0); }
  .c-fab:hover { opacity: 0.85; }
`;

/* Icons */
const Ico = ({ d, d2 }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}{d2}
  </svg>
);
const CopyIco = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);
const MsgIco = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);
const ChevIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const CheckIco = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* Animated Title */
function AnimTitle() {
  const parts = ['Contact', ' ', 'Us'];
  let delay = 0.1;
  return (
    <h1 className="c-hero-title" aria-label="Contact Us">
      {parts.map((w, wi) => {
        if (w === ' ') { delay += 0.04; return <span key={wi} className="c-char-space" />; }
        return w.split('').map((ch, ci) => {
          delay += 0.055;
          const el = wi === 2
            ? <em key={`${wi}-${ci}`} className="c-char" style={{ animationDelay: `${delay}s` }}>{ch}</em>
            : <span key={`${wi}-${ci}`} className="c-char" style={{ animationDelay: `${delay}s` }}>{ch}</span>;
          return el;
        });
      })}
    </h1>
  );
}

/* Copy util */
function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (text, id) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 1800);
    });
  };
  return { copied, copy };
}

const CONTACTS = [
  { name: 'Shivam Ghodake',      phone: '+91 95796 54986', role: 'Lead Coordinator' },
  { name: 'Aakanksha Bhusewar',  phone: '+91 788 805 0888', role: 'Event Coordinator' },
  { name: 'Adarsh Khare',        phone: '+91 70581 51744', role: 'Technical Coordinator' },
];

const RECIPIENT_OPTIONS = [
  { label: 'Abhivriddhi Team (General Inquiries)', email: 'abhivriddhi@vit.edu' },
  { label: 'Shivam Ghodake (Lead Coordinator)', phone: '+91 95796 54986' },
  { label: 'Aakanksha Bhusewar (Event Coordinator)', phone: '+91 788 805 0888' },
  { label: 'Adarsh Khare (Technical Coordinator)', phone: '+91 70581 51744' },
];

const FAQS = [
  { q: 'When and where is the event?', a: 'The event is held at Vishwakarma Institute of Technology, Bibwewadi, Pune. Exact dates are announced on our social channels — follow us to stay updated.' },
  { q: 'How do I register or participate?', a: 'Head to our dedicated Events page for registration details, eligibility, and deadlines. Everything you need is there.' },
  { q: 'I have a sponsorship inquiry — who do I contact?', a: 'Our Sponsors page has partnership tiers and benefits. For direct outreach, use the phone numbers or email listed on this page.' },
  { q: 'How quickly will you respond to my message?', a: 'We typically reply within 24 hours on working days. For urgent matters, calling one of the contacts above is the fastest option.' },
];

const SOCIALS = [
  { label: 'Instagram', cls: 'ig', svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12c0-3.2 0-3.6.1-4.8C2.4 3.9 4 2.3 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 4.9.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24c3.3 0 3.7 0 4.9-.1 4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9 0-3.3 0-3.7-.1-4.9C23.7 2.7 21.3.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4A6.2 6.2 0 0012 5.8zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z"/></svg> },
  { label: 'YouTube',    cls: 'yt', svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg> },
  { label: 'LinkedIn',   cls: 'li', svg: <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 10 1.78 1.78 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg> },
];

export default function Contact() {
  const refs = useRef([]);
  const formRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    recipient: 'Abhivriddhi Team (General Inquiries)',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [showFab, setShowFab] = useState(false);
  const { copied, copy } = useCopy();

  const handleSelectContact = (recipientLabel) => {
    setForm(f => ({ ...f, recipient: recipientLabel }));
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    refs.current.forEach(r => r && obs.observe(r));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const fn = () => setShowFab(window.scrollY > 260);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const r = (i) => (el) => { refs.current[i] = el; };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Required';
    if (!form.email.trim())   e.email   = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.subject.trim()) e.subject = 'Required';
    if (!form.message.trim()) e.message = 'Required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSending(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        // Server returned validation errors or a message
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setSubmitError(data.error || 'Something went wrong. Please try again.');
        }
      }
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const upd = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  return (
    <div className="c-root">
      <style>{styles}</style>

      {/* HERO */}
      <div className="c-hero">
        <div className="c-hero-grid" />
        {/* Horizontal accent lines */}
        <div style={{ position:'absolute', top:'20%', left:0, right:0, height:1, background:'linear-gradient(to right, transparent, rgba(184,204,138,0.12), transparent)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'20%', left:0, right:0, height:1, background:'linear-gradient(to right, transparent, rgba(184,204,138,0.12), transparent)', pointerEvents:'none' }} />
        <div className="c-badge"><span className="c-badge-dot" />Reach Out</div>
        <AnimTitle />
        <p className="c-hero-sub">We're here to assist you with any inquiries</p>
        <div className="c-response">
          <span className="c-response-dot" />
          Typically responds within 24 hours
        </div>
      </div>
      <div className="c-divider" />

      <div className="c-grid">

        {/* Phone */}
        <div className="c-card c-rev" ref={r(0)} style={{ transitionDelay: '0ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.03 1.19 2 2 0 012 .03h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </div>
            <h3 className="c-card-title">Phone Numbers</h3>
          </div>
          <div className="c-phone-grid">
            {CONTACTS.map(({ name, phone, role }) => (
              <div key={name} className="c-person">
                <div
                  className="c-pname"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleSelectContact(`${name} (${role})`)}
                  title={`Click to send message to ${name}`}
                >
                  <span style={{ color: 'var(--text)' }}>{name}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent)', opacity: 0.8 }}>· {role}</span>
                </div>
                <div className="c-prow">
                  <a href={`tel:${phone.replace(/\s/g,'')}`} className="c-pphone">{phone}</a>
                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hello " + name + ", I am reaching out from the Abhivriddhi website.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="c-copybtn"
                    title={`Message ${name} on WhatsApp`}
                    style={{ textDecoration: 'none' }}
                  >
                    <MsgIco />
                  </a>
                  <button
                    className="c-copybtn"
                    onClick={() => handleSelectContact(`${name} (${role})`)}
                    title={`Send inquiry to ${name} in form below`}
                  >
                    <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </button>
                  <button className="c-copybtn" onClick={() => copy(phone, phone)} title="Copy Phone Number">
                    <CopyIco />
                  </button>
                  <span className={`c-toast ${copied === phone ? 'on' : ''}`}>Copied!</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Socials */}
        <div className="c-card c-rev" ref={r(1)} style={{ transitionDelay: '80ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M17 2H7a5 5 0 00-5 5v10a5 5 0 005 5h10a5 5 0 005-5V7a5 5 0 00-5-5z" d2={<><circle cx="12" cy="12" r="3"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></>} />
            </div>
            <h3 className="c-card-title">Connect With Us</h3>
          </div>
          <div className="c-social-grid">
            {SOCIALS.map(({ label, cls, svg }) => (
              <a key={label} href="#" className="c-soc">
                <span className={`c-sic ${cls}`}>{svg}</span>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="c-card c-rev" ref={r(2)} style={{ transitionDelay: '160ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" d2={<circle cx="12" cy="10" r="3"/>} />
            </div>
            <h3 className="c-card-title">Our Location</h3>
          </div>
          <p className="c-loc">Vishwakarma Institute of Technology<br />Bibwewadi, Pune<br />Maharashtra, India</p>
        </div>

        {/* Email */}
        <div className="c-card c-rev" ref={r(3)} style={{ transitionDelay: '240ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" d2={<polyline points="22,6 12,13 2,6"/>} />
            </div>
            <h3 className="c-card-title">Email</h3>
          </div>
          <div className="c-erow">
            <a href="mailto:abhivriddhi@vit.edu" className="c-elink">abhivriddhi@vit.edu</a>
            <button className="c-ecopy" onClick={() => copy('abhivriddhi@vit.edu', 'email')} title="Copy email"><CopyIco /></button>
            <span className={`c-toast ${copied === 'email' ? 'on' : ''}`}>Copied!</span>
          </div>
        </div>

        {/* Map */}
        <div className="c-card c-span2 c-rev" ref={r(4)} style={{ transitionDelay: '320ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" d2={<circle cx="12" cy="10" r="3"/>} />
            </div>
            <h3 className="c-card-title">Find Us</h3>
          </div>
          <div className="c-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.9126349810617!2d73.85!3d18.46!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2eac9a4c49bbf%3A0x8e1b0c5a1e4c1234!2sVishwakarma%20Institute%20of%20Technology!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin"
              allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="VIT Pune Map"
            />
          </div>
        </div>

        {/* Form */}
        <div className="c-card c-span2 c-rev" ref={(el) => { refs.current[6] = el; formRef.current = el; }} style={{ transitionDelay: '400ms' }}>
          <div className="c-card-head">
            <div className="c-card-icon">
              <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </div>
            <h3 className="c-card-title">Send a Message</h3>
          </div>

          {sent ? (
            <div className="c-success">
              <div className="c-success-ico"><CheckIco /></div>
              <h3>Thank <em>You</em></h3>
              <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                Your message has been sent to <strong style={{ color: 'var(--accent)' }}>{form.recipient}</strong>.
              </p>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                A confirmation has been sent to <strong>{form.email}</strong>. We'll respond within 24 hours.
              </p>
              <button
                className="c-btn"
                style={{ marginTop: '20px', padding: '9px 20px', fontSize: '0.82rem' }}
                onClick={() => {
                  setSent(false);
                  setForm(f => ({ ...f, subject: '', message: '' }));
                }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <div>
              <div className="c-fg">
                <label className="c-fl">Recipient / Direct Inquiry To</label>
                <select
                  className="c-fi"
                  value={form.recipient}
                  onChange={e => upd('recipient', e.target.value)}
                  style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                >
                  {RECIPIENT_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.label} style={{ background: '#0a0d0f', color: '#fff' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="c-f2" style={{ marginBottom: '14px' }}>
                <div className="c-fg" style={{ marginBottom: 0 }}>
                  <label className="c-fl">Name</label>
                  <input className={`c-fi ${errors.name ? 'err' : ''}`} type="text" placeholder="Your name" value={form.name} onChange={e => upd('name', e.target.value)} />
                  {errors.name && <span className="c-ferr">{errors.name}</span>}
                </div>
                <div className="c-fg" style={{ marginBottom: 0 }}>
                  <label className="c-fl">Email</label>
                  <input className={`c-fi ${errors.email ? 'err' : ''}`} type="email" placeholder="your@email.com" value={form.email} onChange={e => upd('email', e.target.value)} />
                  {errors.email && <span className="c-ferr">{errors.email}</span>}
                </div>
              </div>
              <div className="c-fg">
                <label className="c-fl">Subject</label>
                <input className={`c-fi ${errors.subject ? 'err' : ''}`} type="text" placeholder="What's this about?" value={form.subject} onChange={e => upd('subject', e.target.value)} />
                {errors.subject && <span className="c-ferr">{errors.subject}</span>}
              </div>
              <div className="c-fg">
                <label className="c-fl">Message</label>
                <textarea className={`c-fi c-ta ${errors.message ? 'err' : ''}`} placeholder="Your message..." value={form.message} onChange={e => upd('message', e.target.value)} />
                {errors.message && <span className="c-ferr">{errors.message}</span>}
              </div>
              <button className="c-btn" onClick={handleSubmit} disabled={sending}>
                {sending ? <><span className="c-spin" /> Sending…</> : <>Send Message →</>}
              </button>
              {submitError && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,100,100,0.08)', border: '1px solid rgba(220,100,100,0.3)', color: '#d07070', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

      </div>


    </div>
  );
}
