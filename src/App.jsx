import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  Users, 
  Layout, 
  Link as LinkIcon, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  BarChart3, 
  ChevronRight,
  Lock,
  Loader2,
  Sparkles,
  Play,
  ChevronLeft,
  ExternalLink,
  Eye,
  Coins,
  Send,
  Clock,
  ToggleRight,
  ToggleLeft,
  Camera
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
// ⚠️ IMPORTANT: Replace these with your actual keys from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDPNJTYVKW4RFUQlvZw1a95R6AU5Om6Auc",
  authDomain: "cinemetricsdemo.firebaseapp.com",
  projectId: "cinemetricsdemo",
  storageBucket: "cinemetricsdemo.firebasestorage.app",
  messagingSenderId: "172545606278",
  appId: "1:172545606278:web:4a8e204967204cabf80707"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = 'cinemetrics-prod'; 

// --- Theme Presets ---
const THEMES = {
  gold: { primary: '#D4AF37', bg: '#FAF9F6', text: '#1A1A1A', card: '#FFFFFF', secondary: '#8A8681' },
  noir: { primary: '#D4AF37', bg: '#0F0F0F', text: '#FFFFFF', card: '#1A1A1A', secondary: '#4A4641' },
  rose: { primary: '#C48B8B', bg: '#F9F4F4', text: '#4A3737', card: '#FFFFFF', secondary: '#8D7676' }
};

// --- Custom Google Icon ---
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// --- Custom Aperture Logo Component ---
const CinemetricsLogo = ({ dark = true, className = "", scale = 1 }) => {
  const color = dark ? "#1A1A1A" : "#FFFFFF";
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      <div className="flex items-center">
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="5" className="mr-[-2px]">
          <circle cx="50" cy="50" r="40" />
          <path d="M50 10 L62 42 L90 50 L58 62 L50 90 L38 58 L10 50 L42 38 Z" strokeWidth="2" fill={dark ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} />
          <line x1="50" y1="10" x2="62" y2="42" />
          <line x1="90" y1="50" x2="58" y2="62" />
          <line x1="50" y1="90" x2="38" y2="58" />
          <line x1="10" y1="50" x2="42" y2="38" />
          <circle cx="50" cy="50" r="10" fill="none" />
        </svg>
        <span className="text-4xl tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, color: color, letterSpacing: '-0.02em' }}>
          inemetrics
        </span>
      </div>
      <span className="text-[9px] tracking-[0.4em] uppercase mt-2 ml-4 font-light" style={{ color: dark ? "#8A8681" : "rgba(255,255,255,0.6)" }}>
        Insightful Creations
      </span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [galleries, setGalleries] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGallery, setNewGallery] = useState({ name: '', targetUrl: '', theme: 'gold' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Guest Gateway States
  const [galleryContext, setGalleryContext] = useState(null);
  const [gateStep, setGateStep] = useState(1); 
  const [guestData, setGuestData] = useState({ name: '', email: '', intent: '', timeline: '' });

  // 1. Auth & Routing
  useEffect(() => {
    // We don't anonymously sign in immediately anymore, we wait for user action
    // unless they are already logged in from a previous session
    const params = new URLSearchParams(window.location.search);
    const gId = params.get('g');
    
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (gId) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'galleries', gId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setGalleryContext({ id: snap.id, ...snap.data() });
            setView('guest');
          }
        } catch (e) { console.error(e) }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Data Sync
  useEffect(() => {
    if (!user || view === 'guest' || view === 'home') return;

    const gQuery = collection(db, 'artifacts', appId, 'public', 'data', 'galleries');
    const unsubG = onSnapshot(gQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => g.ownerId === user.uid);
      setGalleries(list);
    }, (error) => console.error(error));

    const lQuery = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
    const unsubL = onSnapshot(lQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(list);
    }, (error) => console.error(error));

    return () => { unsubG(); unsubL(); };
  }, [user, view]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // --- Login Handlers ---
  const handlePhotographerLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setView('dashboard');
    } catch (error) {
      console.error("Login failed:", error);
      showToast("Sign in cancelled or failed.");
    }
  };

  const handleGuestGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;
      
      // Auto-fill their data and jump to step 3!
      setGuestData({
        ...guestData,
        name: loggedInUser.displayName || 'Guest',
        email: loggedInUser.email || ''
      });
      setGateStep(3);
    } catch (error) {
      console.error("Guest login failed:", error);
      showToast("Google sign-in failed. Please type your email below.");
    }
  };

  // Actions
  const handleCreateGallery = async (e) => {
    e.preventDefault();
    if (!user) return showToast("You must be logged in.");
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'galleries'), {
        ...newGallery,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewGallery({ name: '', targetUrl: '', theme: 'gold' });
      showToast("Gateway Deployed Successfully");
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const finalizeLead = async (intent) => {
    if (!galleryContext) return;
    setIsSaving(true);
    let heat = intent === 'Wedding' ? 'Hot' : (intent === 'Future' ? 'Warm' : 'Cold');
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', galleryContext.ownerId, 'leads'), {
        ...guestData,
        heatScore: heat,
        intentType: intent,
        galleryId: galleryContext.id,
        galleryName: galleryContext.name,
        targetUrl: galleryContext.targetUrl,
        timestamp: serverTimestamp()
      });
      setGateStep(4); 
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F0F0F] text-white">
      <CinemetricsLogo dark={false} className="mb-8 animate-pulse" />
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  // --- VIEW 1: LANDING PAGE ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-[#D4AF37] selection:text-white">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 z-50">
            <span className="text-xs font-bold uppercase tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="fixed top-0 w-full z-50 px-6 md:px-12 py-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-stone-100">
          <CinemetricsLogo dark={true} scale={0.8} />
          <div className="flex items-center gap-6">
            <button onClick={user ? () => setView('dashboard') : handlePhotographerLogin} className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-black transition-all hidden md:block">
              {user ? "Go to Dashboard" : "Sign In"}
            </button>
            <button onClick={user ? () => setView('dashboard') : handlePhotographerLogin} className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black shadow-xl hover:shadow-2xl transition-all flex items-center gap-2">
              {!user && <GoogleIcon />} {user ? "Open Platform" : "Launch Engine"}
            </button>
          </div>
        </nav>

        <section className="relative pt-48 pb-32 px-8 flex flex-col items-center text-center">
          <div className="absolute top-32 left-1/2 -translate-x-1/2 w-full max-w-6xl opacity-[0.03] pointer-events-none select-none flex justify-center">
             <Camera size={600} strokeWidth={0.5} />
          </div>
          
          <div className="max-w-4xl relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] text-stone-600 border border-stone-200">
              <Sparkles size={12} className="text-[#D4AF37]" /> The Future of Wedding Photography
            </div>
            <h1 className="text-6xl md:text-8xl font-serif leading-[1.1] tracking-tight text-[#1A1A1A]">
              Turn your guests into your <span className="italic text-[#D4AF37]">next booking.</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed font-light">
              Cinemetrics is the high-end referral engine. We capture guest emails through a cinematic retrieval experience, automatically nurturing them into future clients.
            </p>
            <div className="flex justify-center gap-6 pt-4">
              <button onClick={user ? () => setView('dashboard') : handlePhotographerLogin} className="px-10 py-5 bg-[#D4AF37] text-black rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-[#C4A030] shadow-[0_0_40px_rgba(212,175,55,0.3)] transition-all flex items-center gap-3">
                {!user && <GoogleIcon />} Start Building Your Lead Vault
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW 2: GUEST GATEWAY ---
  if (view === 'guest' && galleryContext) {
    const theme = THEMES[galleryContext.theme] || THEMES.gold;
    const isDark = theme.bg === '#0F0F0F';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-1000" style={{ backgroundColor: theme.bg, color: theme.text }}>
        
        {/* Toast for Guest */}
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 z-50">
            <span className="text-[10px] font-bold uppercase tracking-widest">{toast}</span>
          </div>
        )}

        <button onClick={() => setView('home')} className="fixed top-8 left-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
          <ChevronLeft size={14} /> Exit Preview
        </button>
        
        <div className="max-w-md w-full p-12 rounded-[50px] shadow-2xl text-center space-y-10 relative overflow-hidden transition-all duration-700" 
             style={{ backgroundColor: theme.card, borderColor: isDark ? '#222' : '#F5F5F0', border: '1px solid' }}>
          
          {gateStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-3xl font-serif italic font-bold" style={{ color: theme.primary }}>{galleryContext.name}</div>
              <div className="w-24 h-24 bg-stone-100 rounded-full mx-auto flex items-center justify-center shadow-inner" style={{ backgroundColor: isDark ? '#111' : '#F5F5F0' }}>
                <Lock className="text-[#D4AF37]" size={32} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-serif">Retrieve Memories</h2>
                <p className="text-sm opacity-60 leading-relaxed px-4 font-light">Secure access to high-resolution cinematic photo retrieval.</p>
              </div>
              <button onClick={() => setGateStep(2)} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: theme.primary, color: isDark ? '#000' : '#FFF' }}>
                Verify Identity
              </button>
            </div>
          )}

          {gateStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 text-left">
              <h2 className="text-3xl font-serif text-center" style={{ color: theme.text }}>Guest Entry</h2>
              
              {/* GOOGLE LOGIN BUTTON */}
              <button onClick={handleGuestGoogleLogin} className="w-full py-5 bg-white border border-stone-200 shadow-sm rounded-2xl text-sm font-bold text-black flex items-center justify-center gap-3 hover:bg-stone-50 transition-all active:scale-[0.98]">
                <GoogleIcon /> Continue with Google
              </button>

              <div className="flex items-center gap-4 py-2 opacity-40">
                <div className="h-px bg-stone-500 flex-1"></div>
                <span className="text-[9px] uppercase tracking-widest font-bold">Or enter manually</span>
                <div className="h-px bg-stone-500 flex-1"></div>
              </div>

              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full p-5 bg-stone-50 border border-stone-100 rounded-2xl text-sm outline-none text-black transition-all focus:border-[#D4AF37]" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} />
                <input type="email" placeholder="Email Address" className="w-full p-5 bg-stone-50 border border-stone-100 rounded-2xl text-sm outline-none text-black transition-all focus:border-[#D4AF37]" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} />
                <button 
                  onClick={() => {
                    if(!guestData.name || !guestData.email) return showToast("Please enter your name and email.");
                    setGateStep(3);
                  }} 
                  className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs text-white bg-black hover:bg-stone-900 transition-all flex justify-center items-center active:scale-[0.98]">
                  Next Step <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {gateStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-center gap-2 text-[#D4AF37] bg-[#D4AF37]/10 py-2.5 rounded-full border border-[#D4AF37]/20 mx-6">
                <Coins size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Legacy Credit Unlocked</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-serif leading-tight">Bank your <span className="italic" style={{ color: theme.primary }}>$200 Gift</span></h2>
                <p className="text-xs opacity-60 leading-relaxed px-4 font-light">As a guest, you've earned a $200 session credit. When should we activate yours?</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => finalizeLead('Wedding')} className="w-full p-5 bg-black text-white rounded-3xl flex items-center justify-between group hover:shadow-2xl transition-all border border-black active:scale-[0.98]">
                  <div className="text-left"><div className="text-[9px] font-bold uppercase opacity-50 tracking-widest mb-1">Activation Target</div><div className="text-sm font-bold">My Wedding (Next 12mo)</div></div>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => finalizeLead('Future')} className="w-full p-5 bg-white border border-stone-200 rounded-3xl flex items-center justify-between group hover:border-[#D4AF37] transition-all active:scale-[0.98]" style={{ backgroundColor: isDark ? '#222' : '#FFF', borderColor: isDark ? '#333' : '#E5E5E5' }}>
                  <div className="text-left"><div className="text-[9px] font-bold uppercase opacity-40 tracking-widest mb-1">Activation Target</div><div className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1A1A1A' }}>Future Milestone (24mo+)</div></div>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => finalizeLead('None')} className="text-[10px] font-bold opacity-40 uppercase tracking-widest hover:opacity-100 transition-opacity">Just retrieval / Skip gift</button>
              </div>
            </div>
          )}

          {gateStep === 4 && (
            <div className="space-y-10 animate-in zoom-in-95 duration-700 text-center py-6">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full mx-auto flex items-center justify-center border-4 border-green-100"><CheckCircle2 size={48} /></div>
              <div className="space-y-4">
                <h2 className="text-4xl font-serif">Check Email</h2>
                <p className="text-sm opacity-60 leading-relaxed px-2 font-light">Your credit is banked. We have securely emailed your private gallery link to <span className="font-bold underline" style={{ color: theme.text }}>{guestData.email}</span>.</p>
              </div>
              <button onClick={() => setGateStep(1)} className="text-[10px] font-bold underline opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">Return Home</button>
            </div>
          )}

          <div className="pt-6 flex items-center justify-center gap-2 opacity-30 mt-8 border-t" style={{ borderColor: isDark ? '#333' : '#F5F5F0' }}>
            <CinemetricsLogo dark={!isDark} scale={0.5} />
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 3: PHOTOGRAPHER DASHBOARD ---
  return (
    <div className="flex h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-stone-100 hidden md:flex flex-col p-8 space-y-12 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <CinemetricsLogo dark={true} scale={0.8} className="self-start" />
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-[#1A1A1A] text-[#D4AF37] shadow-xl' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-900'}`}><Layout size={18} /> Galleries</button>
          <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-[#1A1A1A] text-[#D4AF37] shadow-xl' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-900'}`}><Users size={18} /> Lead Vault</button>
          <button onClick={() => setActiveTab('automations')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'automations' ? 'bg-[#1A1A1A] text-[#D4AF37] shadow-xl' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-900'}`}><Send size={18} /> Automations</button>
        </nav>
        <div className="pt-8 border-t border-stone-100">
          <div className="bg-stone-50 p-6 rounded-[24px] border border-stone-100">
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2">Engine Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
              <span className="text-xs font-bold text-stone-700">All Systems Nominal</span>
            </div>
          </div>
          <button onClick={() => { auth.signOut(); setView('home'); }} className="mt-4 w-full text-center text-[9px] font-bold uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors">Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 lg:p-16 relative">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-8 right-8 bg-[#1A1A1A] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 z-50">
            <CheckCircle2 className="text-[#D4AF37]" size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">{toast}</span>
          </div>
        )}

        <header className="flex justify-between items-start mb-16">
          <div className="space-y-2">
            <h2 className="text-5xl font-serif font-bold tracking-tight">
              {activeTab === 'dashboard' ? 'Galleries' : activeTab === 'leads' ? 'Lead Vault' : 'Email Engine'}
            </h2>
            <p className="text-stone-400 text-[10px] uppercase tracking-[0.4em] font-bold">
              {activeTab === 'dashboard' ? 'Manage your cinematic gateways' : activeTab === 'leads' ? 'Quantified intent metrics' : 'Automated referral loops'}
            </p>
          </div>
          {activeTab === 'dashboard' && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-2xl hover:bg-[#D4AF37] hover:text-black transition-all">
              <Plus size={18} /> Deploy Gateway
            </button>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 animate-in fade-in duration-700">
            {galleries.map(g => (
              <div key={g.id} className="bg-white border border-stone-100 rounded-[40px] p-10 shadow-sm hover:shadow-2xl transition-all group relative flex flex-col h-full">
                <div className="absolute top-10 right-10 w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: THEMES[g.theme]?.primary }}></div>
                <div className="w-14 h-14 bg-stone-50 rounded-3xl flex items-center justify-center text-stone-900 mb-8 group-hover:bg-[#1A1A1A] group-hover:text-[#D4AF37] transition-all shadow-inner"><Camera size={24} strokeWidth={1.5} /></div>
                <h3 className="font-serif text-3xl mb-3 leading-tight">{g.name}</h3>
                <div className="flex flex-wrap gap-2 mb-10 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">{g.theme} Theme</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1.5 rounded-full border border-[#D4AF37]/20">{leads.filter(l => l.galleryId === g.id).length} Leads Captured</span>
                </div>
                <div className="flex items-center gap-3 pt-8 border-t border-stone-100 mt-auto">
                   <button onClick={() => { setGalleryContext(g); setView('guest'); setGateStep(1); }} className="flex-1 py-4 bg-[#1A1A1A] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all flex items-center justify-center gap-2 shadow-lg">
                    <Eye size={14} /> Preview Gate
                   </button>
                   <button onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}?g=${g.id}`;
                     navigator.clipboard.writeText(url);
                     showToast("Link Copied to Clipboard");
                   }} className="p-4 bg-stone-50 rounded-2xl text-stone-400 hover:text-black hover:bg-stone-200 transition-all border border-stone-200"><LinkIcon size={18} /></button>
                </div>
              </div>
            ))}
            {galleries.length === 0 && (
              <div className="col-span-full py-32 border border-stone-200 bg-white rounded-[50px] text-center space-y-6 shadow-sm">
                <div className="text-stone-300 flex justify-center"><Layout size={56} strokeWidth={1} /></div>
                <p className="text-stone-500 font-serif text-2xl">Your cinematic pipeline is empty.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors">Deploy First Gateway</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="bg-white rounded-[50px] border border-stone-100 overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-500">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-100">
                  <th className="px-12 py-8 text-[10px] font-bold uppercase tracking-widest text-stone-400">Prospect</th>
                  <th className="px-12 py-8 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">Heat Score</th>
                  <th className="px-12 py-8 text-[10px] font-bold uppercase tracking-widest text-stone-400">Source Event</th>
                  <th className="px-12 py-8 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Credit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-12 py-8">
                      <div className="font-bold text-lg font-serif text-[#1A1A1A]">{l.name}</div>
                      <div className="text-xs text-stone-400 mt-1">{l.email}</div>
                    </td>
                    <td className="px-12 py-8 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-sm ${l.heatScore === 'Hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' : l.heatScore === 'Warm' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
                        {l.heatScore === 'Hot' && <Sparkles size={12} />}
                        {l.heatScore === 'Warm' && <Clock size={12} />}
                        {l.heatScore}
                      </span>
                    </td>
                    <td className="px-12 py-8 text-xs font-bold text-stone-500 italic">{l.galleryName}</td>
                    <td className="px-12 py-8 text-right font-bold text-xs text-green-600">
                      {l.intentType !== 'None' ? <span className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">$200 Banked</span> : <span className="text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-24 text-center text-stone-400 italic font-serif text-lg">The Lead Vault is pristine. Share your gateways to collect metrics.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- NEW TAB: AUTOMATIONS ENGINE --- */}
        {activeTab === 'automations' && (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-[#1A1A1A] text-white p-12 rounded-[50px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-stone-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 blur-[100px] pointer-events-none"></div>
                <div className="space-y-4 relative z-10">
                  <h3 className="text-4xl font-serif">The Nurture Engine</h3>
                  <p className="text-sm text-stone-400 max-w-lg leading-relaxed font-light">
                    Every guest captured in the Lead Vault automatically enters this communication sequence. You don't lift a finger. They receive your branded emails precisely when it matters most.
                  </p>
                </div>
                <div className="bg-black/50 p-6 rounded-3xl border border-stone-800 backdrop-blur-md relative z-10 text-center min-w-[200px]">
                   <div className="text-4xl font-bold text-[#D4AF37]">{leads.length}</div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-2">Active Sequences</div>
                </div>
             </div>

             <div className="space-y-6 pl-6 border-l-2 border-stone-200 ml-6">
                {/* Email 1 */}
                <div className="relative pl-10 py-4">
                  <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 border-4 border-[#FDFCFB] shadow-sm flex items-center justify-center"></div>
                  <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="space-y-2">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-2"><Send size={12} /> Instant Delivery</div>
                       <h4 className="text-2xl font-serif">"Your Memories are Ready"</h4>
                       <p className="text-xs text-stone-500">Dispatched immediately upon Gateway completion. Delivers the secure gallery link & confirms their $200 credit.</p>
                    </div>
                    <ToggleRight className="text-green-500 shrink-0" size={40} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Email 2 */}
                <div className="relative pl-10 py-4">
                  <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#D4AF37] border-4 border-[#FDFCFB] shadow-sm flex items-center justify-center"></div>
                  <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="space-y-2">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2"><Clock size={12} /> 6 Months Post-Event</div>
                       <h4 className="text-2xl font-serif">"Still Dreaming"</h4>
                       <p className="text-xs text-stone-500">A friendly check-in reminding them of their unused $200 credit. Perfect for converting 'Warm' leads to bookings.</p>
                    </div>
                    <ToggleRight className="text-green-500 shrink-0" size={40} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Email 3 */}
                <div className="relative pl-10 py-4">
                  <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-300 border-4 border-[#FDFCFB] shadow-sm flex items-center justify-center"></div>
                  <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6 opacity-60">
                    <div className="space-y-2">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2"><Clock size={12} /> 12 Months Post-Event</div>
                       <h4 className="text-2xl font-serif">"Happy Anniversary"</h4>
                       <p className="text-xs text-stone-500">Sends a cinematic highlight reel to the entire guest list, ensuring you remain the first photographer they think of.</p>
                    </div>
                    <ToggleLeft className="text-stone-300 shrink-0" size={40} strokeWidth={1.5} />
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Modal Generator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl p-16 rounded-[60px] shadow-2xl space-y-10 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif font-bold">Deploy Gateway</h2>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Connect your pixels to the engine.</p>
            </div>
            <form onSubmit={handleCreateGallery} className="space-y-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Event Reference</label>
                  <input required placeholder="e.g. Anderson Gala" className="w-full p-5 bg-stone-50 border border-stone-100 rounded-3xl outline-none text-sm focus:border-[#D4AF37] transition-all" value={newGallery.name} onChange={e => setNewGallery({...newGallery, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Vault Destination (Pixieset/Pic-Time URL)</label>
                  <input required placeholder="https://..." className="w-full p-5 bg-stone-50 border border-stone-100 rounded-3xl outline-none text-sm font-mono focus:border-[#D4AF37] transition-all" value={newGallery.targetUrl} onChange={e => setNewGallery({...newGallery, targetUrl: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Cinematic Vibe</label>
                <div className="flex gap-6">
                  {Object.keys(THEMES).map(t => (
                    <button key={t} type="button" onClick={() => setNewGallery({...newGallery, theme: t})} 
                            className={`w-14 h-14 rounded-full border-4 transition-all ${newGallery.theme === t ? 'scale-110 border-[#1A1A1A] shadow-xl' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                            style={{ backgroundColor: THEMES[t].primary }}></button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-6 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-3xl shadow-2xl hover:bg-[#D4AF37] hover:text-black transition-all flex items-center justify-center gap-3">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : "Initiate Growth Protocol"}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;700&display=swap');
        .glass-effect { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E8E6E1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
      `}</style>
    </div>
  );
}




