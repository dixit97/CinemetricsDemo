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
  ExternalLink
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
    });

    // Real-time Leads
    const lQuery = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'leads'),
      orderBy('timestamp', 'desc')
    );
    const lUnsub = onSnapshot(lQuery, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

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
        targetUrl: galleryContext.targetUrl, // Ensure Zapier has the link
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

  // --- SUB-COMPONENTS ---

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
          <p className="text-2xl font-serif italic text-stone-800">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );

  // --- MAIN VIEWS ---

  if (view === 'gateway' && galleryContext) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-30"></div>
          
          <div className="p-12 text-center space-y-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center border border-stone-100 shadow-inner">
                <Camera className="text-[#D4AF37] w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-serif italic text-stone-800 tracking-tight">{galleryContext.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="h-px w-4 bg-stone-200"></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Cinematic Gallery</span>
                  <span className="h-px w-4 bg-stone-200"></span>
                </div>
              </div>
            </div>

            {gateStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  <p className="text-xs text-stone-500 leading-relaxed italic">"A portrait is not made in the camera but on either side of it."</p>
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#D4AF37] transition-colors" size={16}/>
                    <input 
                      type="text" 
                      placeholder="Your Full Name" 
                      className="w-full pl-12 pr-4 py-5 bg-stone-50 border border-stone-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 transition-all"
                      value={guestData.name}
                      onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                    />
                  </div>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#D4AF37] transition-colors" size={16}/>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="w-full pl-12 pr-4 py-5 bg-stone-50 border border-stone-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 transition-all"
                      value={guestData.email}
                      onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                    />
                  </div>
                  <button 
                    disabled={!guestData.name || !guestData.email}
                    onClick={() => setGateStep(2)}
                    className="w-full py-5 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-stone-800 transition-all disabled:opacity-30 shadow-xl shadow-black/10 flex items-center justify-center gap-2 group"
                  >
                    Authenticate Access <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 text-[9px] text-stone-300 font-bold uppercase tracking-widest">
                  <Shield size={10}/> End-to-End Encryption Enabled
                </div>
              </div>
            )}

            {gateStep === 2 && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-serif italic text-stone-800">The Cinemetrics Gift</h3>
                  <p className="text-xs text-stone-500">We love celebrating love. Are you planning an event in the next 24 months?</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'Wedding', label: 'Yes, Planning a Wedding', sub: 'Unlock a $200 studio credit instantly.' },
                    { id: 'Future', label: 'Planning a Future Event', sub: 'Receive exclusive session priority.' },
                    { id: 'No', label: 'Just Viewing Memories', sub: 'Straight to the high-res gallery.' }
                  ].map((option) => (
                    <button 
                      key={option.id}
                      onClick={() => finalizeLead(option.id)} 
                      className="p-5 border border-stone-100 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-stone-50 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles size={14} className="text-[#D4AF37]"/>
                      </div>
                      <div className="font-bold text-[10px] uppercase tracking-widest text-stone-800 mb-1">{option.label}</div>
                      <div className="text-[10px] text-stone-400 italic leading-relaxed">{option.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gateStep === 4 && (
              <div className="space-y-8 animate-in fade-in scale-95 duration-700">
                <div className="relative">
                  <div className="w-24 h-24 bg-green-50 rounded-full mx-auto flex items-center justify-center relative z-10">
                    <CheckCircle2 className="text-green-500 w-12 h-12" />
                  </div>
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">Welcome to the Vault</h3>
                  <p className="text-xs text-stone-500 leading-relaxed px-4">
                    Identity verified. Your $200 session credit has been banked for <span className="text-stone-800 font-bold underline decoration-[#D4AF37]">{guestData.email}</span>.
                  </p>
                </div>
                <a 
                  href={galleryContext.targetUrl}
                  className="block w-full py-5 bg-[#D4AF37] text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] text-center shadow-xl shadow-[#D4AF37]/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  Enter High-Res Gallery <Download size={14}/>
                </a>
                <button onClick={() => setView('landing')} className="text-[9px] font-bold text-stone-300 uppercase tracking-[0.3em] hover:text-[#D4AF37] transition-colors">Terminate Session</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-[#D4AF37]/20">
      {/* Navigation */}
      <nav className="px-8 py-6 md:px-12 flex justify-between items-center border-b border-stone-200/40 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#D4AF37] group-hover:rotate-12 transition-transform">
            <Camera size={20} />
          </div>
          <div className="text-xl font-serif font-bold italic tracking-tighter">
            CINE<span className="text-[#D4AF37]">METRICS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-8">
                <button onClick={() => setView('dashboard')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-all flex items-center gap-2">
                  <LayoutDashboard size={14}/> Analytics
                </button>
                <button className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-all flex items-center gap-2">
                  <Globe size={14}/> Network
                </button>
              </div>
              <div className="h-6 w-px bg-stone-200 mx-2"></div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 overflow-hidden">
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => signOut(auth)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-stone-400 transition-all">
                  <LogOut size={18}/>
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={handleGoogleLogin} 
              className="text-[10px] font-bold uppercase tracking-widest px-8 py-4 bg-black text-white rounded-2xl hover:bg-stone-800 transition-all shadow-lg shadow-black/10"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {view === 'dashboard' && user ? (
        <main className="max-w-7xl mx-auto p-8 md:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-serif italic text-stone-800">Studio Intelligence</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/5 px-3 py-1 rounded-full border border-[#D4AF37]/10">
                  <Sparkles size={10}/> Pro Member
                </div>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Refining memory capture for {user.displayName}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center gap-3 px-8 py-5 bg-black text-white rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-all shadow-2xl shadow-black/10 active:scale-95"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform"/> Deploy New Gateway
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Live Gateways" value={galleries.length} icon={LinkIcon} color="bg-blue-500" />
            <StatCard label="Total Leads" value={leads.length} icon={Users} color="bg-[#D4AF37]" />
            <StatCard label="Conversion Rate" value={leads.length > 0 ? `${Math.round((leads.length / (galleries.length * 10)) * 100)}%` : '0%'} icon={BarChart3} color="bg-green-500" />
            <StatCard label="Session Credits" value={`$${leads.length * 200}`} icon={Gift} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Gallery Management */}
            <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-stone-400 flex items-center gap-2">
                  <LayoutDashboard size={14}/> Active Deployment Center
                </h2>
                <div className="h-px flex-1 bg-stone-100 mx-6"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {galleries.length === 0 ? (
                  <div className="col-span-2 p-20 border-2 border-dashed border-stone-100 rounded-[3rem] text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-50 rounded-full mx-auto flex items-center justify-center text-stone-200">
                      <Camera size={24}/>
                    </div>
                    <p className="text-sm font-serif italic text-stone-400">No active gateways. Begin your first deployment.</p>
                  </div>
                ) : (
                  galleries.map(g => (
                    <div key={g.id} className="group bg-white p-10 rounded-[2.5rem] border border-stone-100 hover:border-[#D4AF37]/30 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6">
                        <MoreVertical size={16} className="text-stone-300 hover:text-black cursor-pointer"/>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-[#D4AF37] group-hover:text-white transition-all shadow-inner">
                          <Camera size={24}/>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-2xl font-serif italic text-stone-800">{g.name}</h3>
                          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Created {new Date(g.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                          <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl group/link relative">
                            <span className="text-[9px] font-mono text-stone-400 truncate pr-8">
                              {window.location.origin}?g={g.id}
                            </span>
                            <button 
                              onClick={() => copyLink(g.id)}
                              className="absolute right-3 p-1.5 text-stone-300 hover:text-[#D4AF37] transition-colors"
                            >
                              {copySuccess === g.id ? <CheckCircle2 size={14} className="text-green-500"/> : <Copy size={14}/>}
                            </button>
                          </div>
                          
                          <a 
                            href={`${window.location.origin}?g=${g.id}`}
                            target="_blank"
                            className="flex items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-widest border border-stone-100 rounded-xl hover:bg-black hover:text-white transition-all"
                          >
                            Live Preview <ExternalLink size={12}/>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Lead Feed */}
            <div className="lg:col-span-4 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-stone-400 flex items-center gap-2">
                  <Users size={14}/> Intelligence Feed
                </h2>
                <div className="h-px flex-1 bg-stone-100 mx-6"></div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-stone-50/50 border-b border-stone-50 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent Prospects</span>
                  <span className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-bold rounded-full">LIVE</span>
                </div>
                
                <div className="divide-y divide-stone-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {leads.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                      <Users className="mx-auto text-stone-100" size={32}/>
                      <p className="text-sm font-serif italic text-stone-300 px-8">The vault is quiet. Share your first gateway to begin.</p>
                    </div>
                  ) : (
                    leads.map(l => (
                      <div key={l.id} className="p-6 hover:bg-stone-50 transition-all group flex items-start gap-4">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          l.heatScore === 'Hot' ? 'bg-orange-500 animate-pulse' : 
                          l.heatScore === 'Warm' ? 'bg-blue-400' : 'bg-stone-200'
                        }`}></div>
                        <div className="space-y-2 flex-1">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-stone-800 group-hover:text-[#D4AF37] transition-colors">{l.name}</p>
                              <p className="text-[10px] text-stone-400 font-medium">{l.email}</p>
                            </div>
                            <div className="text-[8px] font-bold text-stone-300 uppercase tracking-tighter">
                              {l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-stone-100 text-stone-500 text-[8px] font-bold uppercase tracking-widest rounded-md">
                              {l.galleryName}
                            </span>
                            {l.heatScore === 'Hot' && (
                              <span className="flex items-center gap-1 text-[8px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md uppercase tracking-widest">
                                <Heart size={8} fill="currentColor"/> High Intent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Anniversary Tip */}
              <div className="bg-gradient-to-br from-black to-stone-800 p-8 rounded-[2.5rem] text-white space-y-4 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Gift size={120}/>
                </div>
                <h4 className="text-lg font-serif italic relative z-10">Revenue Hack</h4>
                <p className="text-xs text-stone-400 leading-relaxed relative z-10">
                  Your "Hot" leads are anniversaries waiting to happen. Set an automated follow-up for 11 months from today.
                </p>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] hover:translate-x-1 transition-all relative z-10">
                  Automate Anniversary Workflow <ArrowRight size={14}/>
                </button>
              </div>
            </div>
          </div>

          {/* Create Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 space-y-10 animate-in zoom-in-95 duration-500 shadow-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-stone-300 hover:text-black transition-colors">
                  <Plus size={24} className="rotate-45"/>
                </button>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] mb-4">
                    <Zap size={24}/>
                  </div>
                  <h3 className="text-3xl font-serif italic text-stone-800">Deploy Gateway</h3>
                  <p className="text-xs text-stone-400 font-medium">Bridge your Pixieset or Dropbox galleries with high-conversion intelligence.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.2em] px-1">Gallery Identity</label>
                    <input 
                      type="text" 
                      placeholder="e.g. The Kensington Wedding 2024" 
                      className="w-full p-5 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 transition-all text-sm"
                      value={newGallery.name}
                      onChange={(e) => setNewGallery({...newGallery, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.2em] px-1">Destination URL (Pixieset/Dropbox)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16}/>
                      <input 
                        type="text" 
                        placeholder="https://yourstudio.pixieset.com/kensington..." 
                        className="w-full pl-12 pr-4 py-5 bg-stone-50 border border-stone-100 rounded-2xl outline-none focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 transition-all text-sm"
                        value={newGallery.targetUrl}
                        onChange={(e) => setNewGallery({...newGallery, targetUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={createGallery}
                    disabled={isSaving || !newGallery.name || !newGallery.targetUrl}
                    className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-30"
                  >
                    {isSaving ? 'Encrypting...' : 'Initiate Growth Protocol'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : view === 'landing' ? (
        /* Restored Luxury Landing View */
        <main className="max-w-6xl mx-auto px-8 py-24 md:py-48 text-center space-y-16 animate-in fade-in duration-1000">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#D4AF37]/5 text-[#D4AF37] rounded-full text-[10px] font-bold uppercase tracking-[0.3em] border border-[#D4AF37]/10">
              <Sparkles size={12}/> The Digital Standard for High-End Studios
            </div>
            <h1 className="text-6xl md:text-8xl font-serif italic text-stone-800 leading-[1.05] tracking-tight">
              Turn Every Guest <br /> into a <span className="text-[#D4AF37] relative">
                Future Booking
                <span className="absolute bottom-4 left-0 w-full h-px bg-[#D4AF37]/30"></span>
              </span>
            </h1>
            <p className="text-stone-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
              Stop giving away your high-res work for free. Secure your galleries behind high-conversion lead gates that build your email list while you sleep.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={handleGoogleLogin} 
              className="w-full md:w-auto px-12 py-6 bg-black text-white rounded-[2rem] font-bold text-[11px] uppercase tracking-[0.25em] shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group"
            >
              Get Started for Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#FAF9F6] bg-stone-200 overflow-hidden shadow-md">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                </div>
              ))}
              <div className="pl-6 text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center">
                Joined by 500+ Luxury Studios
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-24 border-t border-stone-200/40">
            {[
              { icon: Lock, title: "Lead Protection", desc: "No more anonymous downloads. Every guest is a lead." },
              { icon: BarChart3, title: "Heat Scoring", desc: "Know who's actually planning a wedding before you call." },
              { icon: Zap, title: "Instant Automation", desc: "Zero friction delivery of high-res links via email." }
            ].map((feature, i) => (
              <div key={i} className="space-y-4 group">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl mx-auto flex items-center justify-center text-stone-300 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/5 transition-all">
                  <feature.icon size={24}/>
                </div>
                <h3 className="font-serif italic text-xl">{feature.title}</h3>
                <p className="text-xs text-stone-400 leading-relaxed px-4">{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
      ) : null}
    </div>
  );
}

// Add these custom styles to your index.css
const styles = `
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E7E5E4; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
`;
