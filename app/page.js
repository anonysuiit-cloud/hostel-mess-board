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
  
  // Calculate min and max dates (Today + 7 days)
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

    if (!isAuthorized) {
      return alert('Incorrect PIN!');
    }

    if (actionType === 'SOLD') {
      await supabase.from('meal_board').update({ status: 'SOLD' }).eq('id', selectedMeal.id);
    } else if (actionType === 'DELETE') {
      await supabase.from('meal_board').delete().eq('id', selectedMeal.id);
    }

    setSelectedMeal(null);
    setInputPin('');
    fetchListings();
  }

  // Filter listings based on search query (Roll No or Room No)
  const filteredListings = listings.filter(meal => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      meal.roll_no.toLowerCase().includes(query) ||
      meal.room_no.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-xl mx-auto p-4 font-sans text-gray-800 pb-12">
      <header className="text-center my-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Hostel Mess Board</h1>
        <p className="text-sm text-gray-500 mt-1">Exchange extra meals — walk in & settle directly</p>
      </header>

      {/* Post Your Extra Meal Form */}
      <form onSubmit={postListing} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 space-y-4">
        <h2 className="font-bold text-base text-gray-900 border-b pb-2">Post Your Extra Meal</h2>
        <div className="grid grid-cols-2 gap-3">
          <input 
            required 
            placeholder="Roll No (e.g. 07)" 
            value={rollNo} 
            onChange={e => setRollNo(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" 
          />
          <input 
            required 
            placeholder="Room No (e.g. B-204)" 
            value={roomNo} 
            onChange={e => setRoomNo(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" 
          />
          
          {/* Date restriction: min = today, max = 7 days from today */}
          <input 
            required 
            type="date" 
            min={todayStr}
            max={maxDateStr}
            value={mealDate} 
            onChange={e => setMealDate(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" 
          />
          
          <select 
            value={mealType} 
            onChange={e => setMealType(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none"
          >
            <option>Full Day</option>
            <option>Lunch</option>
            <option>Dinner</option>
            <option>Breakfast</option>
          </select>
          
          <input 
            required 
            type="number" 
            placeholder="Price (₹)" 
            value={price} 
            onChange={e => setPrice(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" 
          />
          
          <input 
            required 
            type="password" 
            maxLength={4} 
            placeholder="4-Digit PIN" 
            value={pin} 
            onChange={e => setPin(e.target.value)} 
            className="border border-gray-300 p-2.5 rounded-lg text-sm tracking-widest focus:ring-2 focus:ring-black outline-none" 
          />
        </div>
        <button type="submit" className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition shadow-sm">
          Post Listing
        </button>
      </form>

      {/* Search Filter Bar */}
      <div className="mb-6">
        <input 
          type="text"
          placeholder="🔍 Search by your Roll No or Room No..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-black outline-none"
        />
      </div>

      {/* Listings Feed */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-base text-gray-900">Available Now</h2>
          <span className="text-xs text-gray-400">Showing next 7 days</span>
        </div>

        {filteredListings.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 text-sm">
            {searchQuery ? 'No matching listings found.' : 'No meals listed right now.'}
          </div>
        )}

        {filteredListings.map(meal => (
          <div key={meal.id} className={`border rounded-2xl p-4 flex justify-between items-center bg-white shadow-sm transition ${meal.status === 'SOLD' ? 'opacity-50 bg-gray-50' : 'hover:border-gray-400'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-emerald-600">₹{meal.price}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-semibold">{meal.meal_type}</span>
                <span className="text-xs text-gray-500 font-medium">{meal.meal_date}</span>
              </div>
              <p className="text-sm mt-2 text-gray-600">
                Room: <strong className="text-gray-900 font-semibold">{meal.room_no}</strong> | Roll: <strong className="text-gray-900">{meal.roll_no}</strong>
              </p>
              {meal.status === 'SOLD' && (
                <span className="inline-block mt-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">SOLD OUT</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {meal.status !== 'SOLD' && (
                <button onClick={() => { setSelectedMeal(meal); setActionType('SOLD'); }} className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg font-semibold transition">
                  Mark Sold
                </button>
              )}
              <button onClick={() => { setSelectedMeal(meal); setActionType('DELETE'); }} className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PIN Verification Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full space-y-4 shadow-xl">
            <div>
              <h3 className="font-bold text-base text-gray-900">Enter 4-Digit PIN</h3>
              <p className="text-xs text-gray-500 mt-0.5">Required to modify listing for Roll No: {selectedMeal.roll_no}</p>
            </div>
            <input 
              autoFocus
              type="password" 
              maxLength={4} 
              placeholder="••••" 
              value={inputPin} 
              onChange={e => setInputPin(e.target.value)} 
              className="border border-gray-300 p-3 rounded-xl w-full text-center text-xl tracking-widest focus:ring-2 focus:ring-black outline-none"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={handleSellerAction} className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition">Confirm</button>
              <button onClick={() => { setSelectedMeal(null); setInputPin(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
