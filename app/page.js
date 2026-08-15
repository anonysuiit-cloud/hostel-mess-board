'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MASTER_PIN = "9999";

export default function HostelNoticeBoard() {
  const [listings, setListings] = useState([]);
  const [rollNo, setRollNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 7);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  const [mealDate, setMealDate] = useState(todayStr);
  const [mealType, setMealType] = useState('Full Day');
  const [price, setPrice] = useState('');
  const [pin, setPin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedMeal, setSelectedMeal] = useState(null);
  const [actionType, setActionType] = useState('');
  const [inputPin, setInputPin] = useState('');

  useEffect(() => {
    fetchListings();
    const channel = supabase
      .channel('realtime-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_board' }, fetchListings)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchListings() {
    const { data } = await supabase
      .from('meal_board')
      .select('*')
      .gte('meal_date', todayStr)
      .order('meal_date', { ascending: true });
    setListings(data || []);
  }

  async function postListing(e) {
    e.preventDefault();
    if (pin.length !== 4) return alert('Please enter a 4-digit PIN to manage your listing.');

    const { error } = await supabase.from('meal_board').insert([{
      roll_no: rollNo.trim().toUpperCase(),
      room_no: roomNo.trim().toUpperCase(),
      meal_date: mealDate,
      meal_type: mealType,
      price: parseInt(price),
      seller_pin: pin.trim()
    }]);

    if (error) alert('Error: ' + error.message);
    else {
      setRollNo('');
      setRoomNo('');
      setPrice('');
      setPin('');
      fetchListings();
    }
  }

  async function handleSellerAction() {
    const isAuthorized = inputPin === selectedMeal.seller_pin || inputPin === MASTER_PIN;
    if (!isAuthorized) return alert('Incorrect PIN!');

    if (actionType === 'SOLD') {
      await supabase.from('meal_board').update({ status: 'SOLD' }).eq('id', selectedMeal.id);
    } else if (actionType === 'DELETE') {
      await supabase.from('meal_board').delete().eq('id', selectedMeal.id);
    }

    setSelectedMeal(null);
    setInputPin('');
    fetchListings();
  }

  const filteredListings = listings.filter(meal => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return meal.roll_no.toLowerCase().includes(query) || meal.room_no.toLowerCase().includes(query);
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
            Hostel Community Portal
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Hostel Mess Board
          </h1>
          <p className="text-sm text-slate-400">Exchange extra meals seamlessly — walk in & settle directly</p>
        </header>

        {/* Post Form Card */}
        <form onSubmit={postListing} className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <span>🍱</span> Post Your Extra Meal
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input 
              required 
              placeholder="Roll No (e.g. 07)" 
              value={rollNo} 
              onChange={e => setRollNo(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 transition" 
            />
            <input 
              required 
              placeholder="Room No (e.g. B-204)" 
              value={roomNo} 
              onChange={e => setRoomNo(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 transition" 
            />
            
            <input 
              required 
              type="date" 
              min={todayStr}
              max={maxDateStr}
              value={mealDate} 
              onChange={e => setMealDate(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white transition" 
            />
            
            <select 
              value={mealType} 
              onChange={e => setMealType(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white transition"
            >
              <option className="bg-slate-900">Full Day</option>
              <option className="bg-slate-900">Lunch</option>
              <option className="bg-slate-900">Dinner</option>
              <option className="bg-slate-900">Breakfast</option>
            </select>
            
            <input 
              required 
              type="number" 
              placeholder="Price (₹)" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 transition" 
            />
            
            <input 
              required 
              type="password" 
              maxLength={4} 
              placeholder="4-Digit PIN" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              className="bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-sm tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 transition" 
            />
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98]">
            Publish Listing
          </button>
        </form>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text"
            placeholder="🔍 Search by your Roll No or Room No..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 p-3.5 pl-4 rounded-2xl text-sm text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        {/* Listings Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>🔥</span> Available Now
            </h2>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1 rounded-full">Next 7 Days</span>
          </div>

          {filteredListings.length === 0 && (
            <div className="bg-slate-800/30 border border-dashed border-slate-700/80 rounded-3xl p-10 text-center text-slate-400 text-sm">
              {searchQuery ? 'No matching listings found.' : 'No extra meals listed right now.'}
            </div>
          )}

          <div className="space-y-3">
            {filteredListings.map(meal => (
              <div key={meal.id} className={`bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-4 flex justify-between items-center shadow-lg transition-all ${meal.status === 'SOLD' ? 'opacity-40 bg-slate-900/40' : 'hover:border-indigo-500/50'}`}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black text-emerald-400">₹{meal.price}</span>
                    <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold">{meal.meal_type}</span>
                    <span className="text-xs text-slate-400 font-medium">{meal.meal_date}</span>
                  </div>
                  <p className="text-sm mt-2 text-slate-300">
                    Room: <strong className="text-white font-semibold">{meal.room_no}</strong> | Roll: <strong className="text-white">{meal.roll_no}</strong>
                  </p>
                  {meal.status === 'SOLD' && (
                    <span className="inline-block mt-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">SOLD OUT</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {meal.status !== 'SOLD' && (
                    <button onClick={() => { setSelectedMeal(meal); setActionType('SOLD'); }} className="text-xs bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition">
                      Mark Sold
                    </button>
                  )}
                  <button onClick={() => { setSelectedMeal(meal); setActionType('DELETE'); }} className="text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl font-medium transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PIN Modal */}
        {selectedMeal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-xs w-full space-y-4 shadow-2xl">
              <div>
                <h3 className="font-bold text-base text-white">Enter 4-Digit PIN</h3>
                <p className="text-xs text-slate-400 mt-1">Required to modify listing for Roll No: {selectedMeal.roll_no}</p>
              </div>
              <input 
                autoFocus
                type="password" 
                maxLength={4} 
                placeholder="••••" 
                value={inputPin} 
                onChange={e => setInputPin(e.target.value)} 
                className="bg-slate-800 border border-slate-700 p-3 rounded-xl w-full text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none text-white"
              />
              <div className="flex gap-2 pt-2">
                <button onClick={handleSellerAction} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition">Confirm</button>
                <button onClick={() => { setSelectedMeal(null); setInputPin(''); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-semibold transition">Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
