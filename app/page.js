'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Master Admin PIN for developer overrides
const MASTER_PIN = "9999";

export default function HostelNoticeBoard() {
  const [listings, setListings] = useState([]);
  const [rollNo, setRollNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('Full Day');
  const [price, setPrice] = useState('');
  const [pin, setPin] = useState('');

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
      .gte('meal_date', new Date().toISOString().split('T')[0])
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

  return (
    <div className="max-w-xl mx-auto p-4 font-sans text-gray-800">
      <header className="text-center my-6">
        <h1 className="text-2xl font-bold">Hostel Mess Board</h1>
        <p className="text-sm text-gray-500">Live board for extra meals — walk in & settle directly</p>
      </header>

      {/* Form to Post */}
      <form onSubmit={postListing} className="bg-white border rounded-xl p-4 shadow-sm mb-6 space-y-3">
        <h2 className="font-semibold text-base">Post Your Extra Meal</h2>
        <div className="grid grid-cols-2 gap-2">
          <input required placeholder="Your Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} className="border p-2 rounded text-sm" />
          <input required placeholder="Your Room No" value={roomNo} onChange={e => setRoomNo(e.target.value)} className="border p-2 rounded text-sm" />
          <input required type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} className="border p-2 rounded text-sm" />
          <select value={mealType} onChange={e => setMealType(e.target.value)} className="border p-2 rounded text-sm">
            <option>Full Day</option>
            <option>Lunch</option>
            <option>Dinner</option>
            <option>Breakfast</option>
          </select>
          <input required type="number" placeholder="Price (₹)" value={price} onChange={e => setPrice(e.target.value)} className="border p-2 rounded text-sm" />
          <input required type="password" maxLength={4} placeholder="Set 4-Digit PIN" value={pin} onChange={e => setPin(e.target.value)} className="border p-2 rounded text-sm" />
        </div>
        <button type="submit" className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          Post Listing
        </button>
      </form>

      {/* Listings Feed */}
      <div className="space-y-3">
        <h2 className="font-semibold text-base">Available Now</h2>
        {listings.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No meals listed right now.</p>}

        {listings.map(meal => (
          <div key={meal.id} className={`border rounded-xl p-4 flex justify-between items-center bg-white shadow-sm ${meal.status === 'SOLD' ? 'opacity-50' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-green-700">₹{meal.price}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">{meal.meal_type}</span>
                <span className="text-xs text-gray-500">{meal.meal_date}</span>
              </div>
              <p className="text-sm mt-1">
                Room: <strong className="text-blue-600 font-semibold">{meal.room_no}</strong> | Roll: <strong>{meal.roll_no}</strong>
              </p>
              {meal.status === 'SOLD' && (
                <span className="inline-block mt-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">SOLD OUT</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {meal.status !== 'SOLD' && (
                <button onClick={() => { setSelectedMeal(meal); setActionType('SOLD'); }} className="text-xs bg-gray-100 hover:bg-gray-200 border px-2 py-1 rounded font-medium">
                  Mark Sold
                </button>
              )}
              <button onClick={() => { setSelectedMeal(meal); setActionType('DELETE'); }} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PIN Dialog Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-xl max-w-xs w-full space-y-3 shadow-lg">
            <h3 className="font-bold text-sm">Enter 4-Digit PIN</h3>
            <p className="text-xs text-gray-500">To modify listing for Roll No: {selectedMeal.roll_no}</p>
            <input 
              autoFocus
              type="password" 
              maxLength={4} 
              placeholder="PIN" 
              value={inputPin} 
              onChange={e => setInputPin(e.target.value)} 
              className="border p-2 rounded w-full text-center text-lg tracking-widest"
            />
            <div className="flex gap-2">
              <button onClick={handleSellerAction} className="flex-1 bg-black text-white py-1.5 rounded text-sm font-medium">Confirm</button>
              <button onClick={() => { setSelectedMeal(null); setInputPin(''); }} className="flex-1 bg-gray-100 py-1.5 rounded text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
