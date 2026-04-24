
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  TrendingUp, 
  MapPin, 
  Search, 
  Loader2, 
  Users, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  BarChart3,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { CopilotKit, useCopilotReadable, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RecommendedLocation } from './types';

// Dynamic import for Map to prevent SSR issues
const LocationMap = dynamic(
  () => import('./LocationMap'),
  { ssr: false }
);

const STATE_CITY_MAP: Record<string, string[]> = {
  "Kuala Lumpur": ["Bangsar", "Bukit Bintang", "TTDI", "Cheras", "Setapak"],
  "Selangor": ["Petaling Jaya", "Subang Jaya", "Shah Alam", "Klang", "Puchong"],
  "Pulau Pinang": ["George Town", "Bayan Lepas", "Butterworth", "Bukit Mertajam"],
  "Johor": ["Johor Bahru", "Batu Pahat", "Kluang", "Muar", "Iskandar Puteri"],
  "Melaka": ["Ayer Keroh", "Bandaraya Melaka", "Alor Gajah"],
  "Perak": ["Ipoh", "Taiping", "Teluk Intan", "Manjung"],
  "Negeri Sembilan": ["Seremban", "Port Dickson", "Nilai"],
  "Pahang": ["Kuantan", "Temerloh", "Bentong"],
  "Kedah": ["Alor Setar", "Sungai Petani", "Kulim"],
  "Kelantan": ["Kota Bharu", "Tanah Merah", "Pasir Mas"],
  "Terengganu": ["Kuala Terengganu", "Kemaman", "Dungun"],
  "Perlis": ["Kangar", "Arau"],
  "Sabah": ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu"],
  "Sarawak": ["Kuching", "Miri", "Sibu", "Bintulu"],
  "Putrajaya": ["Precinct 1", "Precinct 15", "Precinct 8"],
  "Labuan": ["Victoria", "Layang-Layangan", "Bebuloh"]
};

// Initial empty state before search

export default function LocationIntelligencePage() {
  const [area, setArea] = useState('Kuala Lumpur');
  const [city, setCity] = useState('Bangsar');
  const [budget, setBudget] = useState('15000');
  const [businessType, setBusinessType] = useState('Cafe');
  const [recommendations, setRecommendations] = useState<RecommendedLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([4.2105, 101.9758]); // Default center of Malaysia
  
  // Contact Owner Mock State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageText, setMessageText] = useState('');

  const handleSearch = async () => {
    if (!area) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:9100/api/location/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area,
          city,
          budget: parseFloat(budget),
          businessType
        }),
      });
      
      const resData = await response.json();
      
      if (resData.status === 'success' && resData.data.length > 0) {
        setRecommendations(resData.data);
        setMapCenter([resData.data[0].coordinates.lat, resData.data[0].coordinates.lng]);
        setSelectedId(resData.data[0].id);
        
        // Reset contact form state on new search
        setIsContactModalOpen(false);
        setMessageSent(false);
        setMessageText('');
      } else {
        console.error("Failed or empty response", resData);
      }
    } catch (error) {
      console.error("Pipeline request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLoc = recommendations.find(l => l.id === selectedId);


  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 p-6 gap-6">
      <header className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-xl border border-white/40 ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-indigo-200 shadow-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kiosk<span className="text-indigo-600">IQ</span> Location</h1>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Expansion Site Intelligence Swarm</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {['State', 'City', 'Budget (RM)', 'Business'].map((label, idx) => (
            <div key={label} className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1">{label}</label>
              {idx === 0 ? (
                <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-36" value={area} onChange={e => {
                  setArea(e.target.value);
                  setCity(STATE_CITY_MAP[e.target.value][0]);
                }}>
                  {Object.keys(STATE_CITY_MAP).map(state => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              ) : idx === 1 ? (
                <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-36" value={city} onChange={e => setCity(e.target.value)}>
                  {STATE_CITY_MAP[area].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              ) : idx === 2 ? (
                <input className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-28" type="number" value={budget} onChange={e => setBudget(e.target.value)} />
              ) : (
                <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={businessType} onChange={e => setBusinessType(e.target.value)}>
                  <option>Cafe</option>
                  <option>Restaurant</option>
                </select>
              )}
            </div>
          ))}
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Analyze Site
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-8 min-h-0">
        <section className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex justify-between items-center pr-2">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommended Sites</h2>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold">TOP 3 RANKING</span>
            </div>
            
            {isLoading ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                {[1, 2, 3].map(i => <div key={i} className="h-28 w-full bg-white/50 rounded-2xl animate-pulse border border-slate-200" />)}
              </div>
            ) : (
              recommendations.map((loc) => (
                <Card 
                  key={loc.id}
                  onClick={() => { setSelectedId(loc.id); setMapCenter([loc.coordinates.lat, loc.coordinates.lng]); }}
                  className={`cursor-pointer transition-all border-2 overflow-hidden hover:shadow-lg ${selectedId === loc.id ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white hover:border-indigo-200 shadow-sm'}`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-black text-slate-800">{loc.name}</CardTitle>
                      <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-black">
                        {loc.finalScore}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1"><MapPin size={14} className="text-indigo-400" /> {loc.coordinates.lat.toFixed(2)}, {loc.coordinates.lng.toFixed(2)}</div>
                      <div className="flex items-center gap-1"><Users size={14} className="text-indigo-400" /> {loc.demandScore}% Demand</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selectedLoc && !isLoading && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">Decision Explained</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{selectedLoc.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col gap-3">
                    <h3 className="text-xs font-black text-emerald-800 uppercase flex items-center gap-2 tracking-widest"><CheckCircle2 size={16} /> Pros</h3>
                    <ul className="text-xs text-emerald-700 font-bold space-y-2">
                      {selectedLoc.pros.map((p, i) => <li key={i} className="flex gap-2"><span>•</span>{p}</li>)}
                    </ul>
                  </div>
                  <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 flex flex-col gap-3">
                    <h3 className="text-xs font-black text-rose-800 uppercase flex items-center gap-2 tracking-widest"><ShieldAlert size={16} /> Risks</h3>
                    <ul className="text-xs text-rose-700 font-bold space-y-2">
                      {selectedLoc.cons.map((c, i) => <li key={i} className="flex gap-2"><span>•</span>{c}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsContactModalOpen(true);
                      setMessageSent(false);
                      setMessageText('');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-100"
                  >
                    <MessageSquare size={18} />
                    Contact Property Owner
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="col-span-8 h-full relative">
          <LocationMap 
            locations={recommendations} 
            selectedId={selectedId} 
            onSelect={(id) => { setSelectedId(id); const loc = recommendations.find(l => l.id === id); if (loc) setMapCenter([loc.coordinates.lat, loc.coordinates.lng]); }} 
            center={mapCenter}
          />
          
          {!isLoading && selectedLoc && (
            <div className="absolute bottom-6 right-6 z-[1000] w-72 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Demand Score</span>
                  <span className="text-xs font-black text-indigo-600">{selectedLoc.demandScore}%</span>
                </div>
                <Progress value={selectedLoc.demandScore} className="h-2 bg-indigo-50" />
                
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competitor Level</span>
                  <span className={`text-xs font-black ${selectedLoc.competitionLevel === 'Low' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedLoc.competitionLevel}</span>
                </div>
                <Progress value={selectedLoc.competitionLevel === 'Low' ? 30 : selectedLoc.competitionLevel === 'Medium' ? 60 : 90} className={`h-2 ${selectedLoc.competitionLevel === 'Low' ? 'bg-emerald-50' : 'bg-rose-50'}`} />
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Contact Owner Modal Overlay */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-100">
            <button onClick={() => setIsContactModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-1.5 rounded-full">
              <X size={18} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2"><MessageSquare size={20} className="text-indigo-600"/> Contact Owner</h3>
            <p className="text-xs font-bold text-indigo-400 mb-6 uppercase tracking-widest">{selectedLoc?.name}</p>
            
            {messageSent ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 animate-in zoom-in duration-300">
                <div className="bg-emerald-100 p-4 rounded-full">
                  <CheckCircle2 size={40} className="text-emerald-600" />
                </div>
                <div>
                  <div className="font-black text-lg">Inquiry Sent!</div>
                  <div className="text-xs font-semibold mt-1 opacity-80">The property agent will reply via email within 24 hours.</div>
                </div>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Estimated Rent</div>
                  <div className="font-black text-slate-800">~RM {selectedLoc?.baseRent?.toLocaleString()}/mo</div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">Your Message</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32" 
                    placeholder={`Hi, I'm interested in viewing the lot at ${selectedLoc?.name} for my business...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                </div>
                <button 
                  disabled={isSending || !messageText.trim()}
                  onClick={() => {
                    setIsSending(true);
                    setTimeout(() => {
                      setIsSending(false);
                      setMessageSent(true);
                    }, 1200); // 1.2s mock loading delay
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:scale-100 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {isSending ? 'Sending securely...' : 'Send Inquiry'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
