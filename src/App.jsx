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
  LayoutDashboard
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
  where
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
const appId = 'cinemetrics-prod'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); 
  const [galleries, setGalleries] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleryContext, setGalleryContext] = useState(null);
  
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
        // Check if we are visiting a specific gallery link
        const params = new URLSearchParams(window.location.search);
        const gId = params.get('g');
        if (gId) {
          fetchGallery(gId);
        } else {
          setView('dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching for Dashboard
  useEffect(() => {
    if (!user || view !== 'dashboard') return;

    const gUnsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'galleries'), (snap) => {
      setGalleries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const lUnsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'leads'), (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { gUnsub(); lUnsub(); };
  }, [user, view]);

  const fetchGallery = async (id) => {
    // In a real app, this would be a public doc lookup
    // For this MVP, we store public metadata in a shared collection
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
    signInWithPopup(auth, provider).catch(err => console.error(err));
  };

  const createGallery = async () => {
    if (!user || !newGallery.name || !newGallery.targetUrl) return;
    setIsSaving(true);
    try {
      const gData = {
        name: newGallery.name,
        targetUrl: newGallery.targetUrl,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };
      
      // 1. Save to Photographer's Private Collection
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'galleries'), gData);
      
      // 2. Save to Public Lookup (so guests can find it)
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
      // SAVE LEAD TO FIRESTORE
      // This is the collection Zapier is watching!
      await addDoc(collection(db, 'artifacts', appId, 'users', galleryContext.ownerId, 'leads'), {
        ...guestData,
        heatScore: heat,
        intentType: intent,
        galleryId: galleryContext.id,
        galleryName: galleryContext.name,
        targetUrl: galleryContext.targetUrl, // CRITICAL: Added for Zapier automation
        timestamp: serverTimestamp()
      });
      setGateStep(4); 
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  // --- RENDERING VIEWS ---

  if (view === 'gateway' && galleryContext) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
          <div className="p-10 text-center space-y-8">
            <div className="text-stone-300 text-xs font-bold uppercase tracking-[0.3em]">Secure Access</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif italic text-stone-800">{galleryContext.name}</h2>
              <p className="text-xs text-stone-400">Cinematic Memory Vault</p>
            </div>

            {gateStep === 1 && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-stone-50 rounded-full mx-auto flex items-center justify-center">
                  <Lock className="text-[#D4AF37] w-8 h-8" />
                </div>
                <p className="text-sm text-stone-500 leading-relaxed">To view and download high-resolution memories, please register your invite below.</p>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl text-sm outline-none focus:border-[#D4AF37] transition-all"
                    value={guestData.name}
                    onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl text-sm outline-none focus:border-[#D4AF37] transition-all"
                    value={guestData.email}
                    onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                  />
                  <button 
                    disabled={!guestData.name || !guestData.email}
                    onClick={() => setGateStep(2)}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all disabled:opacity-50"
                  >
                    Authenticate Access
                  </button>
                </div>
              </div>
            )}

            {gateStep === 2 && (
              <div className="space-y-6 pt-4 animate-in fade-in zoom-in-95">
                <h3 className="text-xl font-serif italic">One quick question...</h3>
                <p className="text-sm text-stone-500">Are you planning a wedding or event in the next 24 months?</p>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => finalizeLead('Wedding')} className="p-4 border border-stone-100 rounded-xl text-left hover:border-[#D4AF37] hover:bg-stone-50 transition-all group">
                    <div className="font-bold text-xs uppercase tracking-widest text-stone-800">Yes, planning a wedding</div>
                    <div className="text-[10px] text-stone-400 mt-1 italic">We have a special "Friend of the Couple" gift for you.</div>
                  </button>
                  <button onClick={() => finalizeLead('Future')} className="p-4 border border-stone-100 rounded-xl text-left hover:border-[#D4AF37] hover:bg-stone-50 transition-all">
                    <div className="font-bold text-xs uppercase tracking-widest text-stone-800">Maybe in the future</div>
                  </button>
                  <button onClick={() => finalizeLead('No')} className="p-4 border border-stone-100 rounded-xl text-left hover:border-[#D4AF37] hover:bg-stone-50 transition-all">
                    <div className="font-bold text-xs uppercase tracking-widest text-stone-800">Just here for the photos</div>
                  </button>
                </div>
              </div>
            )}

            {gateStep === 4 && (
              <div className="space-y-6 pt-4 animate-in fade-in scale-95">
                <div className="w-20 h-20 bg-green-50 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="text-green-500 w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif italic">Access Granted</h3>
                <p className="text-sm text-stone-500 leading-relaxed">We've sent your private access link and a $200 session credit to <span className="font-bold text-stone-800">{guestData.email}</span>.</p>
                <a 
                  href={galleryContext.targetUrl}
                  className="block w-full py-4 bg-[#D4AF37] text-white rounded-xl font-bold text-xs uppercase tracking-widest text-center shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] transition-all"
                >
                  Enter Full Gallery
                </a>
                <button onClick={() => setView('landing')} className="text-[10px] font-bold text-stone-300 uppercase tracking-widest hover:text-stone-500">Return Home</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A]">
      {/* Navigation */}
      <nav className="p-6 md:px-12 flex justify-between items-center border-b border-stone-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="text-xl font-serif font-bold italic tracking-tighter">
          CINE<span className="text-[#D4AF37]">METRICS</span>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <button onClick={() => setView('dashboard')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-all">Dashboard</button>
              <button onClick={() => signOut(auth)} className="p-2 hover:bg-stone-100 rounded-full text-stone-400"><LogOut size={18}/></button>
            </div>
          ) : (
            <button onClick={handleGoogleLogin} className="text-[10px] font-bold uppercase tracking-widest px-6 py-3 border border-stone-200 rounded-full hover:bg-black hover:text-white transition-all">Login</button>
          )}
        </div>
      </nav>

      {view === 'dashboard' && user ? (
        <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
          {/* Dashboard Header */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-4xl font-serif italic">Photographer Vault</h1>
              <p className="text-sm text-stone-400 uppercase tracking-widest font-bold text-[10px]">Welcome back, {user.displayName}</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#D4AF37] transition-all shadow-xl shadow-black/10"
            >
              <Plus size={16}/> Deploy Gateway
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left: Galleries */}
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center gap-2">
                <LinkIcon size={14}/> Active Gateways
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {galleries.map(g => (
                  <div key={g.id} className="group bg-white p-8 rounded-[2rem] border border-stone-100 hover:shadow-2xl hover:shadow-stone-200/50 transition-all cursor-pointer">
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-white transition-all">
                        <Camera size={20}/>
                      </div>
                      <h3 className="text-xl font-serif italic">{g.name}</h3>
                      <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                        <div className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Live Link</div>
                        <ChevronRight size={14} className="text-stone-300"/>
                      </div>
                      <div className="text-[10px] font-mono text-stone-400 truncate">
                        {window.location.origin}?g={g.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Lead Vault */}
            <div className="space-y-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center gap-2">
                <Users size={14}/> Lead Intelligence
              </h2>
              <div className="bg-white rounded-[2rem] border border-stone-100 divide-y divide-stone-50">
                {leads.length === 0 ? (
                  <div className="p-12 text-center text-stone-300 italic text-sm">No leads captured yet.</div>
                ) : (
                  leads.map(l => (
                    <div key={l.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-all first:rounded-t-[2rem] last:rounded-b-[2rem]">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-stone-800">{l.name}</div>
                        <div className="text-[10px] text-stone-400">{l.email}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        l.heatScore === 'Hot' ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-400'
                      }`}>
                        {l.heatScore}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Create Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 fade-in">
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">New Gateway</h3>
                  <p className="text-xs text-stone-400">Bridge your cinematic work with lead capture.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest px-1">Gallery Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah & Ben Wedding" 
                      className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl outline-none focus:border-[#D4AF37]"
                      value={newGallery.name}
                      onChange={(e) => setNewGallery({...newGallery, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest px-1">Destination URL (Pixieset/Dropbox)</label>
                    <input 
                      type="text" 
                      placeholder="https://pixieset.com/..." 
                      className="w-full p-4 bg-stone-50 border border-stone-100 rounded-xl outline-none focus:border-[#D4AF37]"
                      value={newGallery.targetUrl}
                      onChange={(e) => setNewGallery({...newGallery, targetUrl: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black">Cancel</button>
                  <button 
                    onClick={createGallery}
                    className="flex-1 py-4 bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#D4AF37] transition-all"
                  >
                    Initiate Growth Protocol
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* Landing View */
        <main className="max-w-4xl mx-auto px-6 py-20 md:py-32 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
            <Zap size={12}/> The Lead-Generation Engine for Modern Photographers
          </div>
          <h1 className="text-5xl md:text-7xl font-serif italic text-stone-800 leading-[1.1]">
            Turn Every Guest <br /> into a <span className="text-[#D4AF37]">Future Booking.</span>
          </h1>
          <p className="text-stone-400 max-w-xl mx-auto text-lg">
            Stop giving away your galleries for free. Secure your links behind high-converting lead gates that find your next wedding while you sleep.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
            <button onClick={handleGoogleLogin} className="w-full md:w-auto px-10 py-5 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-105 transition-all flex items-center justify-center gap-3">
              Get Started for Free <ArrowRight size={16}/>
            </button>
            <div className="text-[10px] font-bold text-stone-300 uppercase tracking-widest px-4">Trusted by 500+ Luxury Studios</div>
          </div>
        </main>
      )}
    </div>
  );
}
