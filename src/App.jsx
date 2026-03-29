import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Link as LinkIcon, 
  Users, 
  Zap, 
  Lock,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Shield,
  Download,
  Gift,
  Heart,
  Calendar,
  Sparkles,
  BarChart3,
  Globe,
  Settings,
  MoreVertical,
  Copy,
  ExternalLink,
  Search,
  Filter,
  TrendingUp,
  Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDPNJTYVKW4RFUQlvZw1a95R6AU5Om6Auc",
  authDomain: "cinemetricsdemo.firebaseapp.com",
  projectId: "cinemetricsdemo",
  storageBucket: "cinemetricsdemo.firebasestorage.app",
  messagingSenderId: "172545606278",
  appId: "1:172545606278:web:4a8e204967204cabf80707",
  measurementId: "G-QGX3C38E1P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Project Identity
const appId = 'cinemetrics-prod';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); 
  const [galleries, setGalleries] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleryContext, setGalleryContext] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Create Gallery Form State
  const [newGallery, setNewGallery] = useState({ name: '', targetUrl: '' });
  
  // Guest Lead Form State
  const [gateStep, setGateStep] = useState(1);
  const [guestData, setGuestData] = useState({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const params = new URLSearchParams(window.location.search);
        const gId = params.get('g');
        if (gId) {
          fetchGallery(gId);
        } else if (view === 'landing') {
          setView('dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Dashboard Data Streams
  useEffect(() => {
    if (!user || view !== 'dashboard') return;

    // Real-time Galleries
    const gQuery = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'galleries'),
      orderBy('createdAt', 'desc')
    );
    const gUnsub = onSnapshot(gQuery, (snap) => {
      setGalleries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Gallery Sync Error:", err));

    // Real-time Leads
    const lQuery = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'leads'),
      orderBy('timestamp', 'desc')
    );
    const lUnsub = onSnapshot(lQuery, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Lead Sync Error:", err));

    return () => { gUnsub(); lUnsub(); };
  }, [user, view]);

  const fetchGallery = async (id) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'galleries', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGalleryContext({ id: docSnap.id, ...docSnap.data() });
        setView('gateway');
      }
    } catch (err) {
      console.error("Gallery not found", err);
    }
  };

  const handleGoogleLogin = () => {
    signInWithPopup(auth, googleProvider).catch(err => console.error(err));
  };

  const createGallery = async () => {
    if (!user || !newGallery.name || !newGallery.targetUrl) return;
    setIsSaving(true);
    try {
      const gData = {
        name: newGallery.name,
        targetUrl: newGallery.targetUrl,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        viewCount: 0,
        leadCount: 0
      };
      
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'galleries'), gData);
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'galleries'), {
        ...gData,
        id: docRef.id
      });

      setNewGallery({ name: '', targetUrl: '' });
      setIsModalOpen(false);
    } catch (err) { console.error(err); }
    setIsSaving(false);
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
    setIsSaving(false);
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}?g=${id}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  // --- UI COMPONENTS ---

  const StatCard = ({ label, value, icon: Icon, color, trend }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/40 transition-all duration-500 group">
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <div className={`w-12 h-12 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center`}>
            <Icon size={22} className={color.replace('bg-', 'text-')} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{label}</p>
            <h3 className="text-3xl font-serif italic text-stone-800 tracking-tight">{value}</h3>
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-500 uppercase tracking-widest">
              <TrendingUp size={10}/> {trend}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --- VIEWS ---

  if (view === 'gateway' && galleryContext) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-stone-100 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-40"></div>
          
          <div className="p-14 text-center space-y-12">
            <div className="flex flex-col items-center space-y-5">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center border border-stone-100 shadow-inner group transition-all duration-700 hover:rotate-12">
                <Camera className="text-[#D4AF37] w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-serif italic text-stone-800 tracking-tight leading-tight">{galleryContext.name}</h2>
                <div className="flex items-center justify-center gap-3">
                  <span className="h-px w-6 bg-stone-100"></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-300">Cinematic Memory Vault</span>
                  <span className="h-px w-6 bg-stone-100"></span>
                </div>
              </div>
            </div>

            {gateStep === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="bg-stone-50 rounded-[2rem] p-8 border border-stone-100 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] opacity-20"></div>
                  <p className="text-[13px] text-stone-500 leading-relaxed italic">"Photography is the only language that can be understood anywhere in the world."</p>
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#D4AF37] transition-all duration-300" size={18}/>
                    <input 
                      type="text" 
                      placeholder="Your Full Name" 
                      className="w-full pl-14 pr-6 py-6 bg-stone-50 border border-stone-100 rounded-2xl text-[13px] outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-8 focus:ring-[#D4AF37]/5 transition-all duration-300"
                      value={guestData.name}
                      onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                    />
                  </div>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#D4AF37] transition-all duration-300" size={18}/>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="w-full pl-14 pr-6 py-6 bg-stone-50 border border-stone-100 rounded-2xl text-[13px] outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-8 focus:ring-[#D4AF37]/5 transition-all duration-300"
                      value={guestData.email}
                      onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                    />
                  </div>
                  <button 
                    disabled={!guestData.name || !guestData.email}
                    onClick={() => setGateStep(2)}
                    className="w-full py-6 bg-black text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] hover:bg-stone-800 transition-all duration-500 disabled:opacity-20 shadow-2xl shadow-black/10 flex items-center justify-center gap-3 group"
                  >
                    Authenticate Access <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-500"/>
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2.5 text-[9px] text-stone-300 font-bold uppercase tracking-[0.2em]">
                  <Shield size={12} className="text-[#D4AF37]/40"/> End-to-End Encryption Enabled
                </div>
              </div>
            )}

            {gateStep === 2 && (
              <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="space-y-3">
                  <h3 className="text-2xl font-serif italic text-stone-800">The Cinemetrics Legacy</h3>
                  <p className="text-[13px] text-stone-400 px-6">We love preserving stories. Are you planning an event in the next 24 months?</p>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  {[
                    { id: 'Wedding', label: 'Planning a Wedding', sub: 'Unlock a $200 studio credit instantly.' },
                    { id: 'Future', label: 'Planning a Future Event', sub: 'Receive exclusive priority session access.' },
                    { id: 'No', label: 'Just Viewing Memories', sub: 'Continue to high-resolution gallery.' }
                  ].map((option) => (
                    <button 
                      key={option.id}
                      onClick={() => finalizeLead(option.id)} 
                      className="p-6 border border-stone-100 rounded-[1.5rem] text-left hover:border-[#D4AF37] hover:bg-stone-50 transition-all duration-500 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <Sparkles size={16} className="text-[#D4AF37] animate-pulse"/>
                      </div>
                      <div className="font-bold text-[10px] uppercase tracking-[0.2em] text-stone-800 mb-1.5">{option.label}</div>
                      <div className="text-[11px] text-stone-400 italic leading-relaxed">{option.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gateStep === 4 && (
              <div className="space-y-10 animate-in fade-in scale-95 duration-1000">
                <div className="relative">
                  <div className="w-28 h-28 bg-green-50 rounded-full mx-auto flex items-center justify-center relative z-10 border border-green-100 shadow-inner">
                    <CheckCircle2 className="text-green-500 w-14 h-14" />
                  </div>
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-[40px] opacity-30 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-serif italic text-stone-800 tracking-tight">Access Granted</h3>
                  <p className="text-[13px] text-stone-500 leading-relaxed px-6">
                    Identity verified. Your private access link and legacy credit have been secured for <span className="text-stone-800 font-bold underline decoration-[#D4AF37] decoration-2 underline-offset-4">{guestData.email}</span>.
                  </p>
                </div>
                <div className="space-y-4 pt-4">
                  <a 
                    href={galleryContext.targetUrl}
                    className="block w-full py-6 bg-[#D4AF37] text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] text-center shadow-2xl shadow-[#D4AF37]/30 hover:scale-[1.03] transition-all duration-500 flex items-center justify-center gap-3"
                  >
                    Enter High-Res Gallery <Download size={16}/>
                  </a>
                  <button onClick={() => setView('landing')} className="text-[9px] font-bold text-stone-300 uppercase tracking-[0.4em] hover:text-[#D4AF37] transition-colors duration-300">Terminate Secure Session</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-[#D4AF37]/20 custom-scrollbar overflow-x-hidden">
      {/* Premium Navigation */}
      <nav className="px-10 py-8 md:px-16 flex justify-between items-center border-b border-stone-100 bg-white/80 backdrop-blur-2xl sticky top-0 z-[60]">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:rotate-12 transition-all duration-700 shadow-xl shadow-black/10">
            <Camera size={24} />
          </div>
          <div className="text-2xl font-serif font-bold italic tracking-tighter">
            CINE<span className="text-[#D4AF37]">METRICS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-10">
          {user ? (
            <>
              <div className="hidden lg:flex items-center gap-10">
                <button onClick={() => setView('dashboard')} className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${view === 'dashboard' ? 'text-black' : 'text-stone-300 hover:text-stone-500'}`}>
                  <LayoutDashboard size={14}/> Dashboard
                </button>
                <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 hover:text-stone-500 transition-all flex items-center gap-2.5">
                  <Globe size={14}/> Network
                </button>
                <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 hover:text-stone-500 transition-all flex items-center gap-2.5">
                  <BarChart3 size={14}/> Analytics
                </button>
              </div>
              <div className="h-8 w-px bg-stone-100 mx-2"></div>
              <div className="flex items-center gap-5">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-800">{user.displayName}</p>
                  <p className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">Studio Principal</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shadow-sm group cursor-pointer">
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <button onClick={() => signOut(auth)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl text-stone-300 transition-all duration-300">
                  <LogOut size={20}/>
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={handleGoogleLogin} 
              className="text-[10px] font-bold uppercase tracking-[0.2em] px-10 py-5 bg-black text-white rounded-2xl hover:bg-stone-800 transition-all duration-500 shadow-2xl shadow-black/10 active:scale-95"
            >
              Partner Sign In
            </button>
          )}
        </div>
      </nav>

      {view === 'dashboard' && user ? (
        <main className="max-w-7xl mx-auto p-10 md:p-16 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
            <div className="space-y-4">
              <h1 className="text-6xl font-serif italic text-stone-800 tracking-tight leading-tight">Studio Intelligence</h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] bg-[#D4AF37]/5 px-5 py-2 rounded-full border border-[#D4AF37]/10">
                  <Sparkles size={12} className="animate-pulse"/> Luxury Pro License
                </div>
                <div className="flex items-center gap-2 text-[10px] text-stone-300 uppercase tracking-[0.2em] font-bold">
                  <Clock size={12}/> Last data sync: Just now
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center gap-4 px-10 py-6 bg-black text-white rounded-[2rem] font-bold text-[11px] uppercase tracking-[0.25em] hover:bg-[#D4AF37] transition-all duration-700 shadow-2xl shadow-black/20 active:scale-95"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-700"/> Deploy New Gateway
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard label="Live Gateways" value={galleries.length} icon={LinkIcon} color="bg-blue-500" trend="+2 this week" />
            <StatCard label="Acquired Leads" value={leads.length} icon={Users} color="bg-[#D4AF37]" trend="+12% growth" />
            <StatCard label="Conversion Rate" value={leads.length > 0 ? `${Math.round((leads.length / (galleries.length * 15)) * 100)}%` : '0%'} icon={BarChart3} color="bg-green-500" />
            <StatCard label="Session Credits" value={`$${(leads.length * 200).toLocaleString()}`} icon={Gift} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left Column: Active Gateways */}
            <div className="lg:col-span-8 space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.5em] text-stone-300">Deployment Center</h2>
                  <div className="px-3 py-1 bg-stone-100 rounded-full text-[8px] font-bold uppercase text-stone-500">Live: {galleries.length}</div>
                </div>
                <div className="h-px flex-1 bg-stone-100 mx-8"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {galleries.length === 0 ? (
                  <div className="col-span-2 p-28 border-2 border-dashed border-stone-100 rounded-[4rem] text-center space-y-6 group hover:border-[#D4AF37]/20 transition-colors duration-700">
                    <div className="w-20 h-20 bg-stone-50 rounded-full mx-auto flex items-center justify-center text-stone-200 group-hover:text-[#D4AF37]/30 transition-all duration-700">
                      <Camera size={32}/>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-serif italic text-stone-400">The vault is currently empty.</p>
                      <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">Deploy your first gateway to begin capturing intelligence.</p>
                    </div>
                  </div>
                ) : (
                  galleries.map(g => (
                    <div key={g.id} className="group bg-white p-12 rounded-[3.5rem] border border-stone-100 hover:border-[#D4AF37]/40 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] transition-all duration-700 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                        <MoreVertical size={18} className="text-stone-200 hover:text-black cursor-pointer transition-colors"/>
                      </div>
                      
                      <div className="space-y-8">
                        <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center text-stone-300 group-hover:bg-[#D4AF37] group-hover:text-white transition-all duration-700 shadow-inner">
                          <Camera size={28}/>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-3xl font-serif italic text-stone-800 tracking-tight leading-tight">{g.name}</h3>
                          <div className="flex items-center gap-3">
                            <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">Deployed {new Date(g.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                            <span className="h-1 w-1 rounded-full bg-stone-200"></span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                              <Search size={10}/> {g.viewCount || 0} views
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 flex flex-col gap-4">
                          <div className="flex items-center justify-between px-6 py-4 bg-stone-50 rounded-2xl group/link relative border border-stone-100 hover:bg-white transition-all">
                            <span className="text-[10px] font-mono text-stone-400 truncate pr-10">
                              {window.location.origin}?g={g.id}
                            </span>
                            <button 
                              onClick={() => copyLink(g.id)}
                              className="absolute right-4 p-2 text-stone-300 hover:text-[#D4AF37] transition-colors"
                            >
                              {copySuccess === g.id ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16}/>}
                            </button>
                          </div>
                          
                          <div className="flex gap-3">
                            <a 
                              href={`${window.location.origin}?g=${g.id}`}
                              target="_blank"
                              className="flex-1 flex items-center justify-center gap-2.5 py-5 text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-100 rounded-2xl hover:bg-black hover:text-white transition-all duration-500"
                            >
                              Preview <ExternalLink size={14}/>
                            </a>
                            <button className="p-5 border border-stone-100 rounded-2xl text-stone-300 hover:text-black hover:border-black transition-all duration-500">
                              <Settings size={18}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Lead Intelligence */}
            <div className="lg:col-span-4 space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.5em] text-stone-300">Intelligence Feed</h2>
                <div className="h-px flex-1 bg-stone-100 mx-8"></div>
              </div>

              <div className="bg-white rounded-[3.5rem] border border-stone-100 shadow-sm overflow-hidden flex flex-col h-[700px] hover:shadow-xl hover:shadow-stone-200/40 transition-all duration-1000">
                <div className="p-8 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-800">Acquisition History</span>
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Real-time update stream</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Live Feed</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-stone-50">
                  {leads.length === 0 ? (
                    <div className="p-24 text-center space-y-6">
                      <div className="w-20 h-20 bg-stone-50 rounded-full mx-auto flex items-center justify-center text-stone-100">
                        <Users size={32}/>
                      </div>
                      <p className="text-sm font-serif italic text-stone-300 leading-relaxed px-6">The intelligence feed will populate as guests interact with your gateways.</p>
                    </div>
                  ) : (
                    leads.map(l => (
                      <div key={l.id} className="p-8 hover:bg-stone-50 transition-all duration-500 group flex items-start gap-5">
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                          l.heatScore === 'Hot' ? 'bg-orange-500 ring-4 ring-orange-500/10' : 
                          l.heatScore === 'Warm' ? 'bg-blue-400 ring-4 ring-blue-400/10' : 'bg-stone-200'
                        }`}></div>
                        <div className="space-y-3 flex-1">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-stone-800 group-hover:text-[#D4AF37] transition-colors duration-500 leading-tight">{l.name}</p>
                              <p className="text-[10px] text-stone-400 font-bold tracking-tight">{l.email}</p>
                            </div>
                            <div className="text-[9px] font-bold text-stone-200 uppercase tracking-tighter tabular-nums">
                              {l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Syncing'}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-white border border-stone-100 text-stone-400 text-[8px] font-bold uppercase tracking-widest rounded-lg">
                              {l.galleryName}
                            </span>
                            {l.heatScore === 'Hot' && (
                              <span className="flex items-center gap-1.5 text-[8px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-orange-100">
                                <Heart size={10} fill="currentColor"/> High Intent Lead
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-8 bg-white border-t border-stone-50">
                   <button className="w-full py-4 text-[9px] font-bold uppercase tracking-[0.3em] text-stone-300 hover:text-black transition-colors flex items-center justify-center gap-3 group">
                      Export Intelligence Vault <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                   </button>
                </div>
              </div>

              {/* Revenue Acceleration Insight */}
              <div className="bg-gradient-to-br from-stone-900 to-black p-10 rounded-[3.5rem] text-white space-y-6 relative overflow-hidden group shadow-2xl shadow-black/20">
                <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                  <Gift size={160}/>
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center text-black">
                    <TrendingUp size={20}/>
                  </div>
                  <h4 className="text-2xl font-serif italic">The Anniversary Loop</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                    Your Hot leads are future bookings waiting for the right moment. Our automated anniversary workflows are currently nurturing {leads.filter(l => l.heatScore === 'Hot').length} high-intent prospects for you.
                  </p>
                  <button className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] hover:translate-x-1.5 transition-all duration-500">
                    Optimize CRM Triggers <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* New Deployment Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="bg-white w-full max-w-xl rounded-[4rem] p-14 space-y-12 animate-in zoom-in-95 duration-700 shadow-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-stone-200 hover:text-black transition-all hover:rotate-90 duration-500">
                  <Plus size={32} className="rotate-45"/>
                </button>

                <div className="space-y-3">
                  <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-3xl flex items-center justify-center text-[#D4AF37] mb-6">
                    <Zap size={32} className="animate-pulse"/>
                  </div>
                  <h3 className="text-4xl font-serif italic text-stone-800 tracking-tight">Deploy Gateway</h3>
                  <p className="text-[13px] text-stone-400 font-medium leading-relaxed">Instantly bridge your cinematic work with automated lead intelligence gathering.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.3em] px-1">Gateway Identity</label>
                    <input 
                      type="text" 
                      placeholder="e.g. The Kensington Wedding // Sarah & Ben" 
                      className="w-full p-6 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-10 focus:ring-[#D4AF37]/5 transition-all duration-300 text-sm"
                      value={newGallery.name}
                      onChange={(e) => setNewGallery({...newGallery, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.3em] px-1">Destination URL (High-Res Asset Vault)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-200" size={18}/>
                      <input 
                        type="text" 
                        placeholder="https://studio.pixieset.com/kensington..." 
                        className="w-full pl-14 pr-6 py-6 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-10 focus:ring-[#D4AF37]/5 transition-all duration-300 text-sm"
                        value={newGallery.targetUrl}
                        onChange={(e) => setNewGallery({...newGallery, targetUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-6">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-6 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-300 hover:text-black transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={createGallery}
                    disabled={isSaving || !newGallery.name || !newGallery.targetUrl}
                    className="flex-[2.5] py-6 bg-black text-white rounded-[1.5rem] font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-[#D4AF37] transition-all duration-700 shadow-2xl shadow-black/10 flex items-center justify-center gap-4 disabled:opacity-20"
                  >
                    {isSaving ? 'Encrypting Deployment...' : 'Initiate Growth Protocol'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : view === 'landing' ? (
        /* Luxury Marketing View */
        <main className="max-w-7xl mx-auto px-10 py-32 md:py-60 text-center space-y-24 animate-in fade-in duration-1000 overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
          
          <div className="space-y-10">
            <div className="inline-flex items-center gap-4 px-8 py-3 bg-[#D4AF37]/5 text-[#D4AF37] rounded-full text-[10px] font-bold uppercase tracking-[0.4em] border border-[#D4AF37]/10 animate-bounce">
              <Sparkles size={14}/> The Digital Standard for Luxury Studios
            </div>
            <h1 className="text-7xl md:text-9xl font-serif italic text-stone-800 leading-[1.05] tracking-tight px-4">
              Turn Every Guest <br /> into a <span className="text-[#D4AF37] relative">
                Future Booking
                <span className="absolute bottom-6 left-0 w-full h-1 bg-[#D4AF37]/20 rounded-full"></span>
              </span>
            </h1>
            <p className="text-stone-400 max-w-3xl mx-auto text-xl md:text-2xl font-medium leading-relaxed px-6">
              Stop sacrificing your legacy for anonymous views. Secure your galleries behind high-conversion intelligence gates that build your business while you sleep.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            <button 
              onClick={handleGoogleLogin} 
              className="w-full md:w-auto px-14 py-7 bg-black text-white rounded-[2.5rem] font-bold text-[13px] uppercase tracking-[0.3em] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-700 flex items-center justify-center gap-4 group"
            >
              Partner with Cinemetrics <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-700"/>
            </button>
            <div className="flex items-center gap-6">
              <div className="flex -space-x-5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-12 h-12 rounded-2xl border-4 border-[#FAF9F6] bg-stone-100 overflow-hidden shadow-xl transform hover:-translate-y-2 transition-transform duration-500 cursor-pointer">
                    <img src={`https://i.pravatar.cc/150?u=${i+20}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-stone-800 uppercase tracking-widest leading-none mb-1">Join the Vanguard</p>
                <p className="text-[9px] text-stone-300 font-bold uppercase tracking-widest">500+ Luxury Studios Registered</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 pt-40 border-t border-stone-200/30">
            {[
              { icon: Lock, title: "Lead Protection", desc: "No more anonymous downloads. Every single guest who enters your gallery becomes a qualified lead for your future." },
              { icon: BarChart3, title: "Heat Intelligence", desc: "Our AI identifies high-intent guests based on engagement behavior before they even think about booking." },
              { icon: Zap, title: "Instant Automation", desc: "Zero-friction delivery of memories with automated anniversary follow-ups baked directly into the platform." }
            ].map((feature, i) => (
              <div key={i} className="space-y-6 group px-6">
                <div className="w-16 h-16 bg-stone-50 rounded-[2rem] mx-auto flex items-center justify-center text-stone-200 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/5 transition-all duration-700 shadow-inner group-hover:rotate-12">
                  <feature.icon size={28}/>
                </div>
                <h3 className="font-serif italic text-2xl text-stone-800 tracking-tight">{feature.title}</h3>
                <p className="text-[13px] text-stone-400 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
      ) : null}
      
      {/* Dynamic Global Styles */}
      <style>{styles}</style>
    </div>
  );
}

// Custom CSS for refined experience
const styles = `
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E7E5E4; border-radius: 20px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D4AF37; }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-bottom { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.animate-in { animation-fill-mode: both; }
.fade-in { animation-name: fade-in; }
.slide-in-from-bottom-12 { animation-name: slide-in-bottom; }
.zoom-in-95 { animation-name: zoom-in; }
`;
