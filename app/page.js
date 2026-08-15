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
    <main style={styles.main}>
      <div style={styles.container}>
        
        {/* Header */}
        <header style={styles.header}>
          <span style={styles.badge}>Hostel Community Portal</span>
          <h1 style={styles.title}>Hostel Mess Board</h1>
          <p style={styles.subtitle}>Exchange extra meals seamlessly — walk in & settle directly</p>
        </header>

        {/* Post Form Card */}
        <form onSubmit={postListing} style={styles.card}>
          <h2 style={styles.cardTitle}>🍱 Post Your Extra Meal</h2>
          
          <div style={styles.grid}>
            <input 
              required 
              placeholder="Roll No (e.g. 07)" 
              value={rollNo} 
              onChange={e => setRollNo(e.target.value)} 
              style={styles.input} 
            />
            <input 
              required 
              placeholder="Room No (e.g. B-204)" 
              value={roomNo} 
              onChange={e => setRoomNo(e.target.value)} 
              style={styles.input} 
            />
            
            <input 
              required 
              type="date" 
              min={todayStr}
              max={maxDateStr}
              value={mealDate} 
              onChange={e => setMealDate(e.target.value)} 
              style={styles.input} 
            />
            
            <select 
              value={mealType} 
              onChange={e => setMealType(e.target.value)} 
              style={styles.input}
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
              style={styles.input} 
            />
            
            <input 
              required 
              type="password" 
              maxLength={4} 
              placeholder="4-Digit PIN" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              style={styles.input} 
            />
          </div>

          <button type="submit" style={styles.primaryButton}>Publish Listing</button>
        </form>

        {/* Search Bar */}
        <div>
          <input 
            type="text"
            placeholder="🔍 Search by your Roll No or Room No..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        {/* Listings Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>🔥 Available Now</h2>
            <span style={styles.subBadge}>Next 7 Days</span>
          </div>

          {filteredListings.length === 0 && (
            <div style={styles.emptyCard}>
              {searchQuery ? 'No matching listings found.' : 'No extra meals listed right now.'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredListings.map(meal => (
              <div key={meal.id} style={{ ...styles.listingCard, opacity: meal.status === 'SOLD' ? 0.4 : 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.priceTag}>₹{meal.price}</span>
                    <span style={styles.mealBadge}>{meal.meal_type}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{meal.meal_date}</span>
                  </div>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: '#cbd5e1' }}>
                    Room: <strong style={{ color: '#fff' }}>{meal.room_no}</strong> | Roll: <strong style={{ color: '#fff' }}>{meal.roll_no}</strong>
                  </p>
                  {meal.status === 'SOLD' && (
                    <span style={styles.soldBadge}>SOLD OUT</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {meal.status !== 'SOLD' && (
                    <button onClick={() => { setSelectedMeal(meal); setActionType('SOLD'); }} style={styles.actionBtn}>
                      Mark Sold
                    </button>
                  )}
                  <button onClick={() => { setSelectedMeal(meal); setActionType('DELETE'); }} style={styles.deleteBtn}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PIN Modal */}
        {selectedMeal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>Enter 4-Digit PIN</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Required to modify listing for Roll No: {selectedMeal.roll_no}</p>
              <input 
                autoFocus
                type="password" 
                maxLength={4} 
                placeholder="••••" 
                value={inputPin} 
                onChange={e => setInputPin(e.target.value)} 
                style={styles.modalInput}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSellerAction} style={styles.modalConfirmBtn}>Confirm</button>
                <button onClick={() => { setSelectedMeal(null); setInputPin(''); }} style={styles.modalCloseBtn}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

const styles = {
  main: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#f8fafc', padding: '40px 16px', fontFamily: 'system-ui, sans-serif' },
  container: { maxWidth: '540px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { textAlign: 'center' },
  badge: { display: 'inline-block', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', marginBottom: '12px' },
  title: { fontSize: '32px', fontWeight: '900', letterSpacing: '-0.025em', color: '#fff', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: 0 },
  card: { background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51, 65, 85, 0.8)', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '16px', borderBottom: '1px solid rgba(51, 65, 85, 0.6)', paddingBottom: '12px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  input: { width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', padding: '12px', borderRadius: '12px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' },
  primaryButton: { width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', fontWeight: '600', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' },
  searchBar: { width: '100%', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '14px 16px', borderRadius: '16px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' },
  section: { display: 'flex', flexDirection: 'column', gap: '14px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 },
  subBadge: { fontSize: '12px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 12px', borderRadius: '20px' },
  emptyCard: { background: 'rgba(30, 41, 59, 0.3)', border: '1px dashed #334155', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  listingCard: { background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51, 65, 85, 0.8)', borderRadius: '20px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' },
  priceTag: { fontSize: '22px', fontWeight: '900', color: '#34d399' },
  mealBadge: { fontSize: '11px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' },
  soldBadge: { display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: '700', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '6px' },
  actionBtn: { fontSize: '12px', background: '#334155', border: '1px solid #475569', color: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '6px 12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 },
  modalCard: { background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '24px', maxWidth: '320px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' },
  modalInput: { background: '#0f172a', border: '1px solid #334155', padding: '12px', borderRadius: '12px', width: '100%', textAlign: 'center', fontSize: '20px', letterSpacing: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' },
  modalConfirmBtn: { flex: 1, background: '#4f46e5', color: '#fff', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  modalCloseBtn: { flex: 1, background: '#334155', color: '#cbd5e1', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }
};
