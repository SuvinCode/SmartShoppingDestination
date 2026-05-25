import React, { useState, useEffect, useRef } from 'react';
import './DashboardPage.css';
import { API_URL } from '../App';
import { 
  Plus, 
  Trash2, 
  ScanLine, 
  RefreshCw, 
  TrendingUp, 
  Settings, 
  ShoppingBag, 
  Bell, 
  LogOut, 
  User as UserIcon,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Navigation,
  Check,
  Fuel,
  CreditCard,
  MapPin,
  Trophy,
  Star,
  Receipt
} from 'lucide-react';

import Logo from '../components/Logo';

function DashboardPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('compare'); // 'compare' | 'analytics' | 'settings'
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // State for user preferences
  const [preferences, setPreferences] = useState({
    distanceToColesKm: 5.0,
    distanceToWoolworthsKm: 4.0,
    fuelCostPerKm: 0.15,
    hasFlybuys: false,
    hasEverydayRewards: false,
    minSplitSavingThreshold: 3.00,
    region: localStorage.getItem(`docket_region_${user?.userId || 'guest'}`) || 'Melbourne',
    homeAddress: localStorage.getItem(`docket_home_address_${user?.userId || 'guest'}`) || 'Richmond VIC'
  });

  // State for comparison
  const [comparison, setComparison] = useState(null);

  // State for scanned receipts (each receipt is independent data)
  const [scannedReceipts, setScannedReceipts] = useState([]);

  // State for savings history
  const [savingsStats, setSavingsStats] = useState({
    cumulativeSavings: 0,
    totalSpent: 0,
    totalShops: 0,
    averageSavings: 0,
    history: []
  });

  // State for store recommendations (6-phase engine)
  const [storeRecommendations, setStoreRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Local mock catalog for offline fallback autocomplete
  const localCatalog = [
    { Name: 'Penne Pasta', Category: 'Pasta', PackageSize: '500g' },
    { Name: 'De Cecco Spaghetti', Category: 'Pasta', PackageSize: '500g' },
    { Name: 'Fresh Full Cream Milk', Category: 'Milk', PackageSize: '2L' },
    { Name: 'Devondale UHT Full Cream Milk', Category: 'Milk', PackageSize: '1L' },
    { Name: 'Cadbury Dairy Milk Chocolate Block', Category: 'Chocolate', PackageSize: '180g' },
    { Name: 'Heinz Baked Beans', Category: 'Beans', PackageSize: '220g' },
    { Name: 'Morning Fresh Dishwashing Liquid', Category: 'Dishwashing', PackageSize: '900ml' },
    { Name: 'Bulla Cream Classic Vanilla Ice Cream', Category: 'Ice Cream', PackageSize: '2L' },
    { Name: 'White Toast Bread', Category: 'Bread', PackageSize: '650g' },
    { Name: 'Helga\'s Traditional Wholemeal Bread', Category: 'Bread', PackageSize: '750g' },
    { Name: 'Western Star Butter Block Salted', Category: 'Butter', PackageSize: '250g' },
    { Name: 'Bega Tasty Cheese Block', Category: 'Cheese', PackageSize: '500g' },
    { Name: 'Australian Red Gala Apples', Category: 'Produce', PackageSize: '1kg' },
    { Name: 'Cavendish Bananas', Category: 'Produce', PackageSize: '1kg' }
  ];

  const regionStoreData = {
    'Melbourne': {
      displayNames: { Coles: 'Coles Richmond', Woolworths: 'Woolworths South Yarra', Aldi: 'Aldi Richmond', IGA: 'IGA Richmond', Costco: 'Costco Docklands' },
      addresses: { Coles: 'Victoria Gardens Shopping Centre, Richmond VIC 3121', Woolworths: '255 Chapel St, South Yarra VIC 3141', Aldi: '459 Church St, Richmond VIC 3121', IGA: '203 Barkly St, Richmond VIC 3121', Costco: '381 Footscray Rd, Docklands VIC 3008' }
    },
    'Sydney': {
      displayNames: { Coles: 'Coles Bondi Junction', Woolworths: 'Woolworths Town Hall', Aldi: 'Aldi Marrickville', IGA: 'IGA Surry Hills', Costco: 'Costco Casula' },
      addresses: { Coles: 'Westfield Bondi Junction, 500 Oxford St, Bondi Junction NSW 2022', Woolworths: '100 Market St, Sydney NSW 2000', Aldi: '235 Marrickville Rd, Marrickville NSW 2204', IGA: '68 Foveaux St, Surry Hills NSW 2010', Costco: 'Crossroads Homemaker Centre, Casula NSW 2170' }
    },
    'Brisbane': {
      displayNames: { Coles: 'Coles Toowong', Woolworths: 'Woolworths Indooroopilly', Aldi: 'Aldi Toowong', IGA: 'IGA Paddington' },
      addresses: { Coles: 'Toowong Village, 9 Sherwood Rd, Toowong QLD 4066', Woolworths: 'Indooroopilly Shopping Centre, 322 Moggill Rd, Indooroopilly QLD 4068', Aldi: '5 Sherwood Rd, Toowong QLD 4066', IGA: '167 Given Tce, Paddington QLD 4064' }
    },
    'Perth': {
      displayNames: { Coles: 'Coles Subiaco', Woolworths: 'Woolworths Claremont', Aldi: 'Aldi Innaloo', IGA: 'IGA Mt Lawley' },
      addresses: { Coles: 'Crossways Shopping Centre, 166 Rokeby Rd, Subiaco WA 6008', Woolworths: 'Claremont Quarter, 28 St Quentin Ave, Claremont WA 6010', Aldi: 'Ellen Stirling Blvd, Innaloo WA 6018', IGA: '746 Beaufort St, Mt Lawley WA 6050' }
    },
    'Adelaide': {
      displayNames: { Coles: 'Coles Norwood', Woolworths: 'Woolworths Burnside', Aldi: 'Aldi Prospect', IGA: 'IGA Unley', Costco: 'Costco Kilburn' },
      addresses: { Coles: 'Norwood Place, 172 The Parade, Norwood SA 5067', Woolworths: 'Burnside Village, 447 Portrush Rd, Glenside SA 5065', Aldi: '230 Prospect Rd, Prospect SA 5082', IGA: '130 Unley Rd, Unley SA 5061', Costco: '111 Regency Rd, Kilburn SA 5084' }
    },
    'Gold Coast': {
      displayNames: { Coles: 'Coles Robina', Woolworths: 'Woolworths Burleigh', Aldi: 'Aldi Bundall', IGA: 'IGA Mermaid Beach' },
      addresses: { Coles: 'Robina Town Centre, Robina QLD 4226', Woolworths: '149 W Burleigh Rd, Burleigh Heads QLD 4220', Aldi: '76 Bundall Rd, Bundall QLD 4217', IGA: '2535 Gold Coast Hwy, Mermaid Beach QLD 4218' }
    },
    'Hobart': {
      displayNames: { Coles: 'Coles New Town', Woolworths: 'Woolworths Sandy Bay', IGA: 'IGA Battery Point' },
      addresses: { Coles: '340 Elizabeth St, North Hobart TAS 7000', Woolworths: '80 Sandy Bay Rd, Sandy Bay TAS 7005', IGA: '55 Hampden Rd, Battery Point TAS 7004' }
    },
    'Darwin': {
      displayNames: { Coles: 'Coles Casuarina', Woolworths: 'Woolworths Casuarina', IGA: 'IGA Parap' },
      addresses: { Coles: 'Casuarina Square, 247 Trower Rd, Casuarina NT 0810', Woolworths: 'Casuarina Square, 247 Trower Rd, Casuarina NT 0810', IGA: '32 Parap Rd, Parap NT 0820' }
    },
    'Canberra': {
      displayNames: { Coles: 'Coles Manuka', Woolworths: 'Woolworths Woden', Aldi: 'Aldi Belconnen', IGA: 'IGA Kingston', Costco: 'Costco Majura Park' },
      addresses: { Coles: 'Manuka Village, Franklin St, Manuka ACT 2603', Woolworths: 'Westfield Woden, Keltie St, Phillip ACT 2606', Aldi: 'Belconnen Way, Belconnen ACT 2617', IGA: '7 Giles St, Kingston ACT 2604', Costco: 'Mustang Ave, Majura Park ACT 2609' }
    }
  };

  const getStoreDisplayName = (storeName) => {
    const region = preferences.region || 'Melbourne';
    const data = regionStoreData[region] || regionStoreData['Melbourne'];
    return data.displayNames?.[storeName] || storeName;
  };

  const getStoreAddress = (storeName) => {
    const region = preferences.region || 'Melbourne';
    const data = regionStoreData[region] || regionStoreData['Melbourne'];
    return data.addresses?.[storeName] || `${storeName} Supermarket`;
  };

  useEffect(() => {
    const initDashboard = async () => {
      // For demo account, clear the active list on login/session start
      if (user?.username?.toLowerCase() === 'demo') {
        try {
          await fetch(`${API_URL}/lists/clear?userId=${user.userId}`, { method: 'POST' });
        } catch (e) {
          console.warn("Could not clear active list for demo account on backend:", e);
        }
        setShoppingList([]);
        setComparison(null);
      } else {
        await loadShoppingList();
      }
      
      loadPreferences();
      loadSavingsStats();
      loadNotifications();
      loadStoreRecommendations();
    };

    initDashboard();
  }, []);

  useEffect(() => {
    if (shoppingList.length > 0) {
      runComparison();
    } else {
      setComparison(null);
    }
  }, [shoppingList, preferences]);

  // Show dynamic toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Core API Loaders
  const loadShoppingList = async () => {
    try {
      const response = await fetch(`${API_URL}/lists?userId=${user.userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setShoppingList(data);
    } catch {
      // Offline fallback: load empty list for demo, pre-populated list otherwise
      if (user?.username?.toLowerCase() === 'demo') {
        setShoppingList([]);
      } else {
        setShoppingList([
          { id: 1, itemName: "Penne Pasta", quantity: 1, packageSize: "500g" },
          { id: 2, itemName: "Fresh Full Cream Milk", quantity: 2, packageSize: "2L" },
          { id: 3, itemName: "Cadbury Dairy Milk Chocolate Block", quantity: 1, packageSize: "180g" }
        ]);
      }
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/preferences?userId=${user.userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPreferences({
        ...data,
        region: data.region || localStorage.getItem(`docket_region_${user.userId}`) || 'Melbourne',
        homeAddress: localStorage.getItem(`docket_home_address_${user.userId}`) || 'Richmond VIC'
      });
    } catch {
      setPreferences(prev => ({
        ...prev,
        region: localStorage.getItem(`docket_region_${user.userId}`) || 'Melbourne',
        homeAddress: localStorage.getItem(`docket_home_address_${user.userId}`) || 'Richmond VIC'
      }));
    }
  };

  const loadSavingsStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/savings?userId=${user.userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      const normalizedHistory = (data.history || []).map(item => ({
        Date: item.date || item.Date || "",
        AmountSaved: item.amountSaved !== undefined ? item.amountSaved : (item.AmountSaved !== undefined ? item.AmountSaved : 0),
        TotalSpent: item.totalSpent !== undefined ? item.totalSpent : (item.TotalSpent !== undefined ? item.TotalSpent : 0),
        Store: item.store || item.Store || "",
        CumulativeSavings: item.cumulativeSavings !== undefined ? item.cumulativeSavings : (item.CumulativeSavings !== undefined ? item.CumulativeSavings : 0)
      }));

      setSavingsStats({
        cumulativeSavings: data.cumulativeSavings !== undefined ? data.cumulativeSavings : 0,
        totalSpent: data.totalSpent !== undefined ? data.totalSpent : 0,
        totalShops: data.totalShops !== undefined ? data.totalShops : 0,
        averageSavings: data.averageSavings !== undefined ? data.averageSavings : 0,
        history: normalizedHistory
      });
    } catch {
      // Offline fallback: load mock history
      setSavingsStats({
        cumulativeSavings: 75.50,
        totalSpent: 452.50,
        totalShops: 5,
        averageSavings: 15.10,
        history: [
          { Date: "2026-05-01", AmountSaved: 12.40, TotalSpent: 85.20, Store: "Woolworths", CumulativeSavings: 12.40 },
          { Date: "2026-05-08", AmountSaved: 8.50, TotalSpent: 74.10, Store: "Coles", CumulativeSavings: 20.90 },
          { Date: "2026-05-15", AmountSaved: 21.60, TotalSpent: 112.30, Store: "Coles", CumulativeSavings: 42.50 },
          { Date: "2026-05-20", AmountSaved: 14.80, TotalSpent: 92.50, Store: "Woolworths", CumulativeSavings: 57.30 },
          { Date: "2026-05-24", AmountSaved: 18.20, TotalSpent: 88.40, Store: "Woolworths", CumulativeSavings: 75.50 }
        ]
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/notifications?userId=${user.userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {
      const mockNotifs = [
        { id: 1, title: "Weekly Catalogue Winner 🏆", message: "Woolworths is this week's price winner! Shopping there will save you an average of $18.40 on your usual list.", timestamp: "10:30 AM", read: false },
        { id: 2, title: "Cadbury Special Alert 🍫", message: "Cadbury Dairy Milk 180g is currently 1/2 Price ($3.00) at Woolworths! Normal price is $6.00.", timestamp: "Yesterday", read: true }
      ];
      setNotifications(mockNotifs);
      setUnreadCount(1);
    }
  };

  // loadStoreRecommendations — Phase 1-6 store ranking
  const loadStoreRecommendations = async () => {
    setRecommendationsLoading(true);
    try {
      const response = await fetch(`${API_URL}/recommendations?userId=${user.userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setStoreRecommendations(data);
    } catch {
      // Offline mock: simulates realistic output of the 6-phase engine
      setStoreRecommendations({
        productRankings: [
          { productName: 'Full Cream Milk 2L', occurrences: 12, rank: 1, rankWeight: 1.0 },
          { productName: 'White Bread 650g', occurrences: 11, rank: 2, rankWeight: 0.5 },
          { productName: 'Chicken Breast 500g', occurrences: 9, rank: 3, rankWeight: 0.33 },
          { productName: 'Cheese Block 500g', occurrences: 9, rank: 3, rankWeight: 0.33 },
          { productName: 'Eggs 12pk', occurrences: 7, rank: 5, rankWeight: 0.2 },
        ],
        topByWeightedSavings: [
          { storeName: 'Coles', weightedScore: 1.33, estimatedWeeklySaving: 18.00, winningProducts: ['Chicken Breast 500g', 'Western Star Butter Block Salted'], specialDiscounts: ['Chicken Breast 500g'], savingsSummary: 'Strong on your Rank 3 items' },
          { storeName: 'Woolworths', weightedScore: 0.70, estimatedWeeklySaving: 15.00, winningProducts: ['Bega Tasty Cheese Block', 'Eggs 12pk'], specialDiscounts: ['Bega Tasty Cheese Block'], savingsSummary: 'Best for your cheese and eggs' },
          { storeName: 'Aldi', weightedScore: 1.20, estimatedWeeklySaving: 20.00, winningProducts: ['Full Cream Milk', 'White Toast Bread'], specialDiscounts: [], savingsSummary: 'Cheapest milk and bread' },
          { storeName: 'IGA', weightedScore: 0.40, estimatedWeeklySaving: 8.50, winningProducts: ['Eggs 12pk'], specialDiscounts: ['Eggs 12pk'], savingsSummary: 'Convenient but slightly more expensive overall' },
          { storeName: 'Costco', weightedScore: 0.95, estimatedWeeklySaving: 25.00, winningProducts: ['Bega Tasty Cheese Block', 'Full Cream Milk'], specialDiscounts: ['Bega Tasty Cheese Block'], savingsSummary: 'Great bulk savings if you travel' }
        ],
        topByProximity: [
          { storeName: 'Woolworths', distanceKm: 0.8, driveMinutes: 2, proximitySummary: '0.8 km, ~2 min drive' },
          { storeName: 'Coles', distanceKm: 1.2, driveMinutes: 2, proximitySummary: '1.2 km, ~2 min drive' },
          { storeName: 'IGA', distanceKm: 2.1, driveMinutes: 4, proximitySummary: '2.1 km, ~4 min drive' },
          { storeName: 'Aldi', distanceKm: 4.6, driveMinutes: 9, proximitySummary: '4.6 km, ~9 min drive' },
          { storeName: 'Costco', distanceKm: 18.0, driveMinutes: 25, proximitySummary: '18.0 km, ~25 min drive' }
        ],
        tradeOffNarrative: 'Aldi saves you the most ($20.00) but is 4.6 km away. Woolworths saves $5.00 less but is only 0.8 km from you.',
        itemComparisons: [
          { productName: 'Full Cream Milk 2L', cheapestStore: 'Aldi', storePrices: { 'Coles': { price: 3.10, isSpecial: false, specialDetails: '', packageSize: '2L' }, 'Woolworths': { price: 3.10, isSpecial: false, specialDetails: '', packageSize: '2L' }, 'Aldi': { price: 2.49, isSpecial: false, specialDetails: '', packageSize: '2L' }, 'IGA': { price: 3.40, isSpecial: false, specialDetails: '', packageSize: '2L' }, 'Costco': { price: 4.99, isSpecial: false, specialDetails: '', packageSize: '3L' } } },
          { productName: 'White Bread 650g', cheapestStore: 'Aldi', storePrices: { 'Coles': { price: 2.70, isSpecial: false, specialDetails: '', packageSize: '650g' }, 'Woolworths': { price: 2.70, isSpecial: false, specialDetails: '', packageSize: '650g' }, 'Aldi': { price: 1.99, isSpecial: false, specialDetails: '', packageSize: '650g' }, 'IGA': { price: 2.90, isSpecial: true, specialDetails: 'Save $0.60', packageSize: '650g' }, 'Costco': { price: 4.49, isSpecial: false, specialDetails: '', packageSize: '1300g' } } },
          { productName: 'Cheese Block 500g', cheapestStore: 'Aldi', storePrices: { 'Coles': { price: 8.50, isSpecial: true, specialDetails: 'Save $1.00', packageSize: '500g' }, 'Woolworths': { price: 9.50, isSpecial: false, specialDetails: '', packageSize: '500g' }, 'Aldi': { price: 5.99, isSpecial: false, specialDetails: '', packageSize: '500g' }, 'IGA': { price: 8.99, isSpecial: false, specialDetails: '', packageSize: '500g' }, 'Costco': { price: 12.99, isSpecial: false, specialDetails: '', packageSize: '1kg' } } },
          { productName: 'Chocolate Block 180g', cheapestStore: 'Aldi', storePrices: { 'Coles': { price: 6.00, isSpecial: false, specialDetails: '', packageSize: '180g' }, 'Woolworths': { price: 3.00, isSpecial: true, specialDetails: '1/2 Price', packageSize: '180g' }, 'Aldi': { price: 1.79, isSpecial: false, specialDetails: '', packageSize: '200g' }, 'IGA': { price: 5.50, isSpecial: true, specialDetails: 'Save $0.50', packageSize: '180g' } } },
          { productName: 'Bananas 1kg', cheapestStore: 'Aldi', storePrices: { 'Coles': { price: 3.90, isSpecial: false, specialDetails: '', packageSize: '1kg' }, 'Woolworths': { price: 3.90, isSpecial: false, specialDetails: '', packageSize: '1kg' }, 'Aldi': { price: 3.49, isSpecial: false, specialDetails: '', packageSize: '1kg' }, 'IGA': { price: 4.00, isSpecial: false, specialDetails: '', packageSize: '1kg' } } }
        ]
      });
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // 2. Autocomplete Search Handler
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setAutocompleteResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/catalog/search?q=${encodeURIComponent(val)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAutocompleteResults(data);
    } catch {
      // Local fallback matching
      const filtered = localCatalog.filter(item => 
        item.Name.toLowerCase().includes(val.toLowerCase()) || 
        item.Category.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      
      setAutocompleteResults(filtered.map(f => ({ name: f.Name, category: f.Category, packageSize: f.PackageSize })));
    }
  };

  // 3. Add Item to List
  const handleAddItem = async (itemName, packageSize = "") => {
    const newItemPayload = {
      userId: user.userId,
      itemName,
      quantity: 1,
      packageSize: packageSize || "",
      isCompleted: false
    };

    try {
      const response = await fetch(`${API_URL}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemPayload)
      });
      if (!response.ok) throw new Error();
      await loadShoppingList();
      showToast(`Added ${itemName}`);
    } catch {
      // Offline fallback: update local state
      const localNew = { 
        id: Date.now(), 
        itemName, 
        quantity: 1, 
        packageSize: packageSize || "500g" 
      };
      setShoppingList([...shoppingList, localNew]);
      showToast(`Added ${itemName} (offline)`);
    }
    setSearchQuery('');
    setAutocompleteResults([]);
  };

  // 4. Delete Item
  const handleDeleteItem = async (id) => {
    try {
      const response = await fetch(`${API_URL}/lists/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error();
      await loadShoppingList();
    } catch {
      // Offline fallback
      setShoppingList(shoppingList.filter(item => item.id !== id));
      showToast('Item removed');
    }
  };

  // 5. Quantity Adjustments
  const handleUpdateQty = (id, newQty) => {
    if (newQty < 1) return;
    
    // Optimistic local update to keep layout snap-fast
    setShoppingList(shoppingList.map(item => 
      item.id === id ? { ...item, quantity: newQty } : item
    ));

    // Send update request to server (can fail silently as we'll sync comparison)
    const matchedItem = shoppingList.find(item => item.id === id);
    if (!matchedItem) return;
    
    const payload = {
      ...matchedItem,
      quantity: newQty
    };

    fetch(`${API_URL}/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  };

  // 6. Clear List
  const handleClearList = async () => {
    try {
      await fetch(`${API_URL}/lists/clear?userId=${user.userId}`, { method: 'POST' });
      await loadShoppingList();
    } catch {
      setShoppingList([]);
      showToast('List cleared');
    }
  };

  const renderCategoryCard = (rec, title, emoji, themeColor) => {
    if (!rec || !rec.storeName) return null;
    return (
      <div className="category-rec-card glass-panel animate-slide-up" style={{ borderLeft: `4px solid ${themeColor}`, padding: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem' }}>{emoji}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
            </div>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
              {getStoreDisplayName(rec.storeName)}
            </h4>
          </div>
          <span className="savings-chip" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue-500)', fontSize: '0.75rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {rec.metricValue}
          </span>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-charcoal)', lineHeight: '1.4' }}>
          {rec.explanation}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={10} style={{ color: 'var(--blue-500)', flexShrink: 0 }} />
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{getStoreAddress(rec.storeName)}</span>
          </div>
        </div>

        {rec.winningProducts && rec.winningProducts.length > 0 && (
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cheapest Items:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {rec.winningProducts.slice(0, 3).map(p => (
                <span key={p} className="product-win-tag" style={{ fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-glass)' }}>{p}</span>
              ))}
              {rec.winningProducts.length > 3 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{rec.winningProducts.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        <a 
          className="btn btn-secondary" 
          target="_blank" 
          rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(preferences.homeAddress || 'Richmond VIC')}&destination=${encodeURIComponent(getStoreDisplayName(rec.storeName) + ', ' + getStoreAddress(rec.storeName))}`}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '5px 0', fontSize: '0.75rem', textDecoration: 'none', marginTop: '4px' }}
        >
          <Navigation size={10} /> View in Google Maps
        </a>
      </div>
    );
  };

  // 7. Sync Loyalty purchase history
  const handleSyncLoyalty = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lists/sync-loyalty?userId=${user.userId}`, { method: 'POST' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setShoppingList(data);
      showToast('Synced history from Flybuys & Everyday Rewards!');
    } catch {
      // Offline fallback
      setShoppingList([
        { id: 101, itemName: "White Toast Bread", quantity: 1, packageSize: "650g" },
        { id: 102, itemName: "Fresh Full Cream Milk", quantity: 2, packageSize: "2L" },
        { id: 103, itemName: "Bega Tasty Cheese Block", quantity: 1, packageSize: "500g" },
        { id: 104, itemName: "Cavendish Bananas", quantity: 1, packageSize: "1kg" }
      ]);
      showToast('Synced loyalty history (offline)');
    } finally {
      setLoading(false);
    }
  };

  // 8. Run comparison engine calculations
  const runComparison = async () => {
    try {
      const response = await fetch(`${API_URL}/lists/compare?userId=${user.userId}`, { method: 'POST' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setComparison(data);
    } catch {
      // Offline Comparison Engine Simulation (JavaScript Implementation of the C# algorithm)
      // This ensures 100% functionality of comparisons offline!
      const simulatedColesList = [];
      const simulatedWooliesList = [];
      
      const mockDatabase = {
        'penne pasta': { colesPrice: 1.30, wooliesPrice: 1.30, colesSpecial: false, wooliesSpecial: false, size: '500g', colesStock: 0.05, wooliesStock: 0.02 },
        'fresh milk': { colesPrice: 3.10, wooliesPrice: 3.10, colesSpecial: false, wooliesSpecial: false, size: '2L', colesStock: 0.04, wooliesStock: 0.03 },
        'full cream milk': { colesPrice: 3.10, wooliesPrice: 3.10, colesSpecial: false, wooliesSpecial: false, size: '2L', colesStock: 0.04, wooliesStock: 0.03 },
        'cadbury chocolate': { colesPrice: 6.00, wooliesPrice: 3.00, colesSpecial: false, wooliesSpecial: true, size: '180g', colesStock: 0.01, wooliesStock: 0.15 },
        'cadbury dairy milk chocolate block': { colesPrice: 6.00, wooliesPrice: 3.00, colesSpecial: false, wooliesSpecial: true, size: '180g', colesStock: 0.01, wooliesStock: 0.15 },
        'heinz beans': { colesPrice: 2.50, wooliesPrice: 2.20, colesSpecial: false, wooliesSpecial: false, size: '220g', colesStock: 0.03, wooliesStock: 0.02 },
        'heinz baked beans': { colesPrice: 2.50, wooliesPrice: 2.20, colesSpecial: false, wooliesSpecial: false, size: '220g', colesStock: 0.03, wooliesStock: 0.02 },
        'white toast bread': { colesPrice: 2.70, wooliesPrice: 2.70, colesSpecial: false, wooliesSpecial: false, size: '650g', colesStock: 0.03, wooliesStock: 0.04 },
        'toast bread': { colesPrice: 2.70, wooliesPrice: 2.70, colesSpecial: false, wooliesSpecial: false, size: '650g', colesStock: 0.03, wooliesStock: 0.04 },
        'bega cheese': { colesPrice: 8.50, wooliesPrice: 9.50, colesSpecial: true, wooliesSpecial: false, size: '500g', colesStock: 0.04, wooliesStock: 0.02 },
        'bega tasty cheese block': { colesPrice: 8.50, wooliesPrice: 9.50, colesSpecial: true, wooliesSpecial: false, size: '500g', colesStock: 0.04, wooliesStock: 0.02 },
        'bananas': { colesPrice: 3.90, wooliesPrice: 3.90, colesSpecial: false, wooliesSpecial: false, size: '1kg', colesStock: 0.01, wooliesStock: 0.02 },
        'cavendish bananas': { colesPrice: 3.90, wooliesPrice: 3.90, colesSpecial: false, wooliesSpecial: false, size: '1kg', colesStock: 0.01, wooliesStock: 0.02 },
        'apples': { colesPrice: 4.50, wooliesPrice: 4.20, colesSpecial: false, wooliesSpecial: false, size: '1kg', colesStock: 0.02, wooliesStock: 0.03 },
        'australian red gala apples': { colesPrice: 4.50, wooliesPrice: 4.20, colesSpecial: false, wooliesSpecial: false, size: '1kg', colesStock: 0.02, wooliesStock: 0.03 }
      };

      shoppingList.forEach(item => {
        const key = item.itemName.toLowerCase();
        // Resolve database product mock
        const dbItem = mockDatabase[key] || { colesPrice: 3.00, wooliesPrice: 3.20, colesSpecial: false, wooliesSpecial: false, size: item.packageSize || 'ea', colesStock: 0.02, wooliesStock: 0.02 };
        
        simulatedColesList.push({
          listItemId: item.id,
          searchQuery: item.itemName,
          matchedItem: { name: 'Coles ' + item.itemName, shelfPrice: dbItem.colesPrice, normalPrice: dbItem.colesSpecial ? dbItem.colesPrice + 1.00 : dbItem.colesPrice, outOfStockProbability: dbItem.colesStock, packageSize: dbItem.size },
          quantity: item.quantity,
          totalPrice: dbItem.colesPrice * item.quantity,
          normalPrice: (dbItem.colesSpecial ? dbItem.colesPrice + 1.00 : dbItem.colesPrice) * item.quantity,
          isSpecial: dbItem.colesSpecial,
          specialDetails: dbItem.colesSpecial ? "Save $1.00" : ""
        });

        simulatedWooliesList.push({
          listItemId: item.id,
          searchQuery: item.itemName,
          matchedItem: { name: 'Woolworths ' + item.itemName, shelfPrice: dbItem.wooliesPrice, normalPrice: dbItem.wooliesSpecial ? dbItem.wooliesPrice + 3.00 : dbItem.wooliesPrice, outOfStockProbability: dbItem.wooliesStock, packageSize: dbItem.size },
          quantity: item.quantity,
          totalPrice: dbItem.wooliesPrice * item.quantity,
          normalPrice: (dbItem.wooliesSpecial ? dbItem.wooliesPrice + 3.00 : dbItem.wooliesPrice) * item.quantity,
          isSpecial: dbItem.wooliesSpecial,
          specialDetails: dbItem.wooliesSpecial ? "1/2 Price Special" : ""
        });
      });

      // Coles totals
      const colesShelf = simulatedColesList.reduce((a, b) => a + b.totalPrice, 0);
      const colesFuel = preferences.distanceToColesKm * 2 * preferences.fuelCostPerKm;
      const colesRewards = preferences.hasFlybuys ? (colesShelf * 0.005 + simulatedColesList.filter(i => i.isSpecial).length * 0.25) : 0;
      const colesAdjusted = colesShelf + colesFuel - colesRewards;
      const colesRisk = 100 * (1 - simulatedColesList.reduce((acc, i) => acc * (1 - i.matchedItem.outOfStockProbability), 1));

      // Woolworths totals
      const wooliesShelf = simulatedWooliesList.reduce((a, b) => a + b.totalPrice, 0);
      const wooliesFuel = preferences.distanceToWoolworthsKm * 2 * preferences.fuelCostPerKm;
      const wooliesRewards = preferences.hasEverydayRewards ? (wooliesShelf * 0.005 + simulatedWooliesList.filter(i => i.isSpecial).length * 0.25) : 0;
      const wooliesAdjusted = wooliesShelf + wooliesFuel - wooliesRewards;
      const wooliesRisk = 100 * (1 - simulatedWooliesList.reduce((acc, i) => acc * (1 - i.matchedItem.outOfStockProbability), 1));

      // Result assembly
      const bestSingle = colesAdjusted <= wooliesAdjusted ? "Coles" : "Woolworths";
      const bestSingleTotal = colesAdjusted <= wooliesAdjusted ? colesAdjusted : wooliesAdjusted;
      const worstSingleTotal = colesAdjusted > wooliesAdjusted ? colesAdjusted : wooliesAdjusted;

      const mockResult = {
        winnerStore: bestSingle,
        singleStoreWinner: bestSingle,
        totalSavings: worstSingleTotal - bestSingleTotal,
        singleStoreSavings: worstSingleTotal - bestSingleTotal,
        coles: { storeName: "Coles", basketItems: simulatedColesList, shelfTotal: colesShelf, normalTotal: simulatedColesList.reduce((a, b) => a+b.normalPrice, 0), fuelAdjustment: colesFuel, rewardsValue: colesRewards, adjustedTotal: colesAdjusted, stockRiskPercentage: Math.round(colesRisk, 1), specialsCount: simulatedColesList.filter(i => i.isSpecial).length },
        woolworths: { storeName: "Woolworths", basketItems: simulatedWooliesList, shelfTotal: wooliesShelf, normalTotal: simulatedWooliesList.reduce((a, b) => a+b.normalPrice, 0), fuelAdjustment: wooliesFuel, rewardsValue: wooliesRewards, adjustedTotal: wooliesAdjusted, stockRiskPercentage: Math.round(wooliesRisk, 1), specialsCount: simulatedWooliesList.filter(i => i.isSpecial).length }
      };
      
      setComparison(mockResult);
    }
  };

  // 9. Receipt upload handlers
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleScanDocuments = async () => {
    if (uploadedFiles.length === 0) {
      showToast("Please upload at least one receipt first.", "error");
      return;
    }

    setOcrLoading(true);
    let successCount = 0;
    const newReceipts = [];

    for (let file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/lists/upload-receipt?userId=${user.userId}`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        successCount++;

        newReceipts.push({
          id: Date.now() + successCount,
          store: data.store,
          storeLocation: data.storeLocation || '',
          storeDisplayName: data.storeDisplayName || data.store,
          receiptTotal: data.receiptTotal,
          items: data.items || [],
          fileName: file.name
        });

        showToast(`Scanned ${data.storeDisplayName || data.store} receipt — Total: $${(data.receiptTotal || 0).toFixed(2)}`);
      } catch (err) {
        console.warn("OCR API call failed (simulating locally):", err.message);

        const isWoolworths = file.name.toLowerCase().includes('woolworths') || file.name.toLowerCase().includes('ww') || file.name.toLowerCase().includes('woolies');
        const store = isWoolworths ? "Woolworths" : "Coles";
        const location = isWoolworths ? "South Yarra" : "Richmond";

        const mockItems = isWoolworths ? [
          { itemName: "Full Cream Milk", quantity: 1, unitPrice: 3.60, totalPrice: 3.60, packageSize: "2L" },
          { itemName: "Helga's Wholemeal Bread", quantity: 1, unitPrice: 3.50, totalPrice: 3.50, packageSize: "750g" },
          { itemName: "Bananas", quantity: 1, unitPrice: 3.90, totalPrice: 3.90, packageSize: "1kg" }
        ] : [
          { itemName: "Full Cream Milk", quantity: 2, unitPrice: 3.60, totalPrice: 7.20, packageSize: "2L" },
          { itemName: "White Toast Bread", quantity: 1, unitPrice: 2.70, totalPrice: 2.70, packageSize: "650g" },
          { itemName: "Bananas", quantity: 1, unitPrice: 3.50, totalPrice: 3.50, packageSize: "1kg" }
        ];

        const mockTotal = mockItems.reduce((sum, i) => sum + i.totalPrice, 0);

        newReceipts.push({
          id: Date.now() + successCount,
          store,
          storeLocation: location,
          storeDisplayName: `${store} ${location}`,
          receiptTotal: mockTotal,
          items: mockItems,
          fileName: file.name
        });

        successCount++;
        showToast(`Scanned ${store} ${location} receipt — Total: $${mockTotal.toFixed(2)} (offline)`);
      }
    }

    setScannedReceipts(prev => [...prev, ...newReceipts]);
    await loadStoreRecommendations();
    setOcrLoading(false);
    setUploadedFiles([]);
    showToast(`Successfully processed ${successCount} receipt${successCount !== 1 ? 's' : ''} as purchase history.`);
  };

  // 10. Checkout list & Save savings
  const handleCheckout = async () => {
    if (!comparison) return;
    
    const pickedOption = comparison.winnerStore === 'Coles' ? comparison.coles : comparison.woolworths;
    
    const payload = {
      storePicked: pickedOption.storeName,
      amountSaved: comparison.totalSavings,
      totalSpent: pickedOption.adjustedTotal
    };

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lists/checkout?userId=${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error();
      
      showToast(`Shopping logged! Saved $${payload.amountSaved.toFixed(2)}`);
      setShoppingList([]);
      await loadSavingsStats();
      setActiveTab('analytics');
    } catch {
      // Offline checkout
      const newLog = {
        Date: new Date().toISOString().split('T')[0],
        AmountSaved: parseFloat(payload.amountSaved),
        TotalSpent: parseFloat(payload.totalSpent),
        Store: payload.storePicked,
        CumulativeSavings: savingsStats.cumulativeSavings + parseFloat(payload.amountSaved)
      };

      setSavingsStats({
        cumulativeSavings: savingsStats.cumulativeSavings + newLog.AmountSaved,
        totalSpent: savingsStats.totalSpent + newLog.TotalSpent,
        totalShops: savingsStats.totalShops + 1,
        averageSavings: (savingsStats.cumulativeSavings + newLog.AmountSaved) / (savingsStats.totalShops + 1),
        history: [...savingsStats.history, newLog]
      });

      setShoppingList([]);
      showToast(`Shopping logged (offline)! Saved $${payload.amountSaved.toFixed(2)}`);
      setActiveTab('analytics');
    } finally {
      setLoading(false);
    }
  };

  // 11. Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        distanceToColesKm: preferences.distanceToColesKm,
        distanceToWoolworthsKm: preferences.distanceToWoolworthsKm,
        fuelCostPerKm: preferences.fuelCostPerKm,
        hasFlybuys: preferences.hasFlybuys,
        hasEverydayRewards: preferences.hasEverydayRewards,
        minSplitSavingThreshold: preferences.minSplitSavingThreshold,
        region: preferences.region || 'Melbourne'
      };
      const response = await fetch(`${API_URL}/preferences?userId=${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error();
      localStorage.setItem(`docket_home_address_${user.userId}`, preferences.homeAddress || 'Richmond VIC');
      localStorage.setItem(`docket_region_${user.userId}`, preferences.region || 'Melbourne');
      showToast('Preferences updated successfully!');
      await loadStoreRecommendations();
    } catch {
      localStorage.setItem(`docket_home_address_${user.userId}`, preferences.homeAddress || 'Richmond VIC');
      localStorage.setItem(`docket_region_${user.userId}`, preferences.region || 'Melbourne');
      showToast('Preferences saved locally (offline)');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // SVG Chart Render Helper (Zero Dependency Charting)
  const renderSavingsChart = () => {
    const history = savingsStats.history;
    if (history.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = 20;

    // Find max value
    const maxVal = Math.max(...history.map(h => h.CumulativeSavings), 20);
    const minVal = 0;

    // Map points to SVG coordinates
    const points = history.map((h, i) => {
      const x = padding + (i * (width - padding * 2)) / Math.max(1, history.length - 1);
      const y = height - padding - ((h.CumulativeSavings - minVal) * (height - padding * 2)) / (maxVal - minVal);
      return { x, y, data: h };
    });

    // Construct path line
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Construct gradient area fill path
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg-container" style={{ width: '100%' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - padding * 2);
          const gridVal = maxVal - r * (maxVal - minVal);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize={8} textAnchor="end">
                ${gridVal.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Areas & Lines */}
        {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
        {linePath && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2.5} />}

        {/* Scatter Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="var(--primary)" strokeWidth={2} />
            {/* Minimal tooltips using SVG titles */}
            <title>{`Shop ${i + 1}: saved $${p.data.AmountSaved.toFixed(2)} (${p.data.Store})`}</title>
            <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize={8} fontWeight="bold" textAnchor="middle">
              ${p.data.CumulativeSavings.toFixed(0)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-msg animate-slide-up`}>
          <CheckCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo" onClick={() => setActiveTab('compare')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={28} />
          <span>Docket</span>
        </div>
        
        <div className="dash-user-section">
          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <Bell 
              className="notifications-bell" 
              size={20} 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) handleMarkNotificationsRead();
              }}
            />
            {unreadCount > 0 && <span className="bell-badge"></span>}
            
            {showNotifications && (
              <div className="glass-panel notification-drawer animate-fade-in">
                <div className="drawer-header">
                  <h4 style={{ fontSize: '0.95rem' }}>Weekly Notifications</h4>
                  <span 
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => setShowNotifications(false)}
                  >
                    Close
                  </span>
                </div>
                <div className="drawer-items">
                  {notifications.map(n => (
                    <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-msg">{n.message}</span>
                      <span className="notif-time">{n.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User badge */}
          <div className="user-profile-badge">
            <UserIcon size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>
          </div>

          <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div className="container dash-main">
        {/* Navigation Tabs */}
        <nav className="dash-tabs">
          <button 
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <ShoppingBag size={18} /> Optimize Basket
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={18} /> Savings History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} /> My Settings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <Trophy size={18} /> Recommendations
          </button>
        </nav>

        {/* Tab content */}
        {activeTab === 'compare' && (
          <div className="view-section compare-grid">
            {/* LEFT COLUMN: List Builder Wrapper */}
            <div className="left-column-wrapper animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel builder-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                  Build Shopping List
                </h3>
                
                {/* Autocomplete Input */}
                <div className="search-box-wrapper">
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Search grocery item (e.g. Milk, Pasta)"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <Plus size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />

                  {autocompleteResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autocompleteResults.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="autocomplete-item"
                          onClick={() => handleAddItem(item.name, item.packageSize)}
                        >
                          <span className="autocomplete-item-name">{item.name}</span>
                          {item.packageSize && <span className="autocomplete-item-size">{item.packageSize}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shopping List Items */}
                <div className="shopping-list">
                  {shoppingList.length > 0 ? (
                    shoppingList.map((item) => (
                      <div key={item.id} className="list-item">
                        <div className="list-item-left">
                          <span className="list-item-name">{item.itemName}</span>
                          {item.packageSize && <span className="list-item-size">({item.packageSize})</span>}
                        </div>
                        
                        <div className="list-item-right">
                          <div className="qty-controls">
                            <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>-</button>
                            <span className="qty-value">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>+</button>
                          </div>
                          <Trash2 className="delete-btn" size={16} onClick={() => handleDeleteItem(item.id)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '30px 10px', textAlignment: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '10px' }}>
                      Your list is currently empty.
                    </div>
                  )}
                </div>

                {shoppingList.length > 0 && (
                  <button className="btn btn-secondary" onClick={handleClearList} style={{ width: '100%', fontSize: '0.85rem' }}>
                    Clear Active List
                  </button>
                )}

                {/* OCR Image Upload Dropzone */}
                <div className="ocr-dropzone">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    multiple
                    style={{ display: 'none' }} 
                  />
                  
                  {ocrLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>AI OCR Scanning Receipts...</span>
                    </div>
                  ) : (
                    <>
                      <div onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ width: '100%', cursor: 'pointer' }}>
                        <ScanLine size={24} style={{ color: 'var(--primary)', marginBottom: '4px' }} />
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>+ Upload Receipts</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select multiple receipt images or documents</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Scan Actions & Queue */}
                <div className="scan-actions-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {uploadedFiles.length > 0 && !ocrLoading && (
                    <div className="uploaded-files-queue glass-panel animate-slide-up" style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '8px' }}>
                        Scan Queue ({uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>{file.name}</span>
                            <Trash2 
                              size={14} 
                              style={{ color: 'var(--danger)', cursor: 'pointer' }} 
                              onClick={() => handleRemoveFile(idx)} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    onClick={handleScanDocuments} 
                    disabled={ocrLoading || uploadedFiles.length === 0}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <RefreshCw size={14} className={ocrLoading ? "animate-spin" : ""} /> 
                    {ocrLoading ? "Scanning..." : "Scan Documents"}
                  </button>
                </div>

                {/* Loyalty card purchase history import */}
                <div className="loyalty-sync-box">
                  <span className="loyalty-title">Sync Loyalty Purchase History</span>
                  <div className="loyalty-buttons">
                    <button className="btn btn-secondary" onClick={handleSyncLoyalty} style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem' }}>
                      <CreditCard size={14} /> Flybuys Sync
                    </button>
                    <button className="btn btn-secondary" onClick={handleSyncLoyalty} style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem' }}>
                      <CreditCard size={14} /> Rewards Sync
                    </button>
                  </div>
                </div>
              </div>

              {/* Recommendations Box */}
              {scannedReceipts.length > 0 && storeRecommendations && (
                <div className="glass-panel recommendations-box animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                    <Trophy size={18} style={{ color: 'var(--blue-600)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Recommendations</h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {renderCategoryCard(storeRecommendations.cheapestWeighted, "Cheapest Shop (Recurring)", "🏆", "var(--success)")}
                    {renderCategoryCard(storeRecommendations.cheapestUnweighted, "Cheapest Overall (Average)", "💰", "var(--blue-500)")}
                    {renderCategoryCard(storeRecommendations.nearestStore, "Nearest Shop", "📍", "var(--purple-500)")}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Comparison Engine Panel */}
            <div className="comparison-panel animate-slide-up">
              {shoppingList.length > 0 && comparison ? (
                <>
                  {/* Hero Savings Recommendation Banner */}
                  <div className="glass-panel recommendation-banner">
                    <div>
                      <span className="rec-badge">Recommended Shop</span>
                      <h2 className="rec-title">
                        Shop <span className="rec-savings">{getStoreDisplayName(comparison.winnerStore)}</span> this week
                      </h2>
                      <p className="rec-split-highlight">
                        You'll save <strong style={{ color: 'var(--success)' }}>${comparison.singleStoreSavings.toFixed(2)}</strong> this week by shopping here.
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={handleCheckout} disabled={loading} style={{ padding: '14px 24px' }}>
                      Checkout & Log Savings
                    </button>
                  </div>

                  {/* Store cards grid */}
                  <div className="store-options-grid">
                    {/* Coles option */}
                    <div className={`store-option-card ${comparison.winnerStore === 'Coles' ? 'winner' : ''}`}>
                      <div className="store-option-header">
                        <span className="store-option-name" style={{ color: 'var(--primary)' }}>{getStoreDisplayName('Coles')}</span>
                        {comparison.winnerStore === 'Coles' && <span className="badge badge-success">Cheapest</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <MapPin size={10} /> {getStoreAddress('Coles')}
                      </div>
                      <div className="store-option-total">${comparison.coles.adjustedTotal.toFixed(2)}</div>
                      <div className="store-option-breakdown">
                        <div className="breakdown-row">
                          <span>Shelf Items Total</span>
                          <span>${comparison.coles.shelfTotal.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Travel/Fuel cost</span>
                          <span>+${comparison.coles.fuelAdjustment.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Flybuys points value</span>
                          <span style={{ color: 'var(--success)' }}>-${comparison.coles.rewardsValue.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                          <span>Out-of-stock risk</span>
                          <span className={comparison.coles.stockRiskPercentage > 10 ? 'stock-risk-indicator' : ''}>
                            {comparison.coles.stockRiskPercentage > 10 && <AlertTriangle size={10} />}
                            {comparison.coles.stockRiskPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Woolworths option */}
                    <div className={`store-option-card ${comparison.winnerStore === 'Woolworths' ? 'winner' : ''}`}>
                      <div className="store-option-header">
                        <span className="store-option-name" style={{ color: 'var(--primary)' }}>{getStoreDisplayName('Woolworths')}</span>
                        {comparison.winnerStore === 'Woolworths' && <span className="badge badge-success">Cheapest</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <MapPin size={10} /> {getStoreAddress('Woolworths')}
                      </div>
                      <div className="store-option-total">${comparison.woolworths.adjustedTotal.toFixed(2)}</div>
                      <div className="store-option-breakdown">
                        <div className="breakdown-row">
                          <span>Shelf Items Total</span>
                          <span>${comparison.woolworths.shelfTotal.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Travel/Fuel cost</span>
                          <span>+${comparison.woolworths.fuelAdjustment.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Rewards points value</span>
                          <span style={{ color: 'var(--success)' }}>-${comparison.woolworths.rewardsValue.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                          <span>Out-of-stock risk</span>
                          <span className={comparison.woolworths.stockRiskPercentage > 10 ? 'stock-risk-indicator' : ''}>
                            {comparison.woolworths.stockRiskPercentage > 10 && <AlertTriangle size={10} />}
                            {comparison.woolworths.stockRiskPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item-by-item comparison table */}
                  <div className="glass-panel breakdown-card">
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison Details</h3>
                    <div className="breakdown-table-wrapper">
                      <table className="breakdown-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>{getStoreDisplayName('Coles')}</th>
                            <th>{getStoreDisplayName('Woolworths')}</th>
                            <th>Stock Reliability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shoppingList.map((item, idx) => {
                            const cItem = comparison.coles.basketItems[idx];
                            const wItem = comparison.woolworths.basketItems[idx];
                            if (!cItem || !wItem) return null;

                            const cMatched = cItem.matchedItem || cItem.MatchedItem || {};
                            const wMatched = wItem.matchedItem || wItem.MatchedItem || {};

                            const colesPrice = cMatched.shelfPrice || 0;
                            const wooliesPrice = wMatched.shelfPrice || 0;
                            
                            const colesCheaper = colesPrice <= wooliesPrice;
                            const wooliesCheaper = wooliesPrice < colesPrice;

                            const cIsSpecial = cItem.isSpecial || cItem.IsSpecial;
                            const wIsSpecial = wItem.isSpecial || wItem.IsSpecial;

                            const cStockRisk = cMatched.outOfStockProbability || 0;
                            const wStockRisk = wMatched.outOfStockProbability || 0;

                            return (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      Qty: {item.quantity} | {cMatched.packageSize || 'ea'}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className={colesCheaper ? 'best-price-highlight' : ''}>
                                      ${(colesPrice * item.quantity).toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      (${colesPrice.toFixed(2)} ea)
                                    </span>
                                    {cIsSpecial && <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>Special</span>}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className={wooliesCheaper ? 'best-price-highlight' : ''}>
                                      ${(wooliesPrice * item.quantity).toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      (${wooliesPrice.toFixed(2)} ea)
                                    </span>
                                    {wIsSpecial && <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>Special</span>}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '0.8rem' }}>
                                      C: {Math.round((1 - cStockRisk) * 100)}% | W: {Math.round((1 - wStockRisk) * 100)}%
                                    </div>
                                    {((cIsSpecial && cStockRisk > 0.1) || (wIsSpecial && wStockRisk > 0.1)) && (
                                      <span className="stock-risk-indicator" style={{ fontSize: '0.68rem' }}>
                                        <AlertTriangle size={10} /> Special stock risk
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Scanned Receipts Summary */}
                  {scannedReceipts.length > 0 && (
                    <div className="glass-panel breakdown-card" style={{ marginTop: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Receipt size={18} style={{ color: 'var(--blue-600)' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Scanned Receipts</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {scannedReceipts.map((receipt) => (
                          <div key={receipt.id} className="glass-panel" style={{ padding: '12px', border: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={14} style={{ color: 'var(--blue-500)' }} />
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{receipt.storeDisplayName}</span>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '1rem' }}>${(receipt.receiptTotal || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {receipt.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', padding: '2px 0' }}>
                                  <span>{item.itemName} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                                  <span>${(item.totalPrice || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px' }}>
                  <ShoppingBag size={48} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>Awaiting shopping list...</h3>
                    <p style={{ fontSize: '0.9rem' }}>Add some grocery items to start running comparison optimizations</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab content: Savings Analytics */}
        {activeTab === 'analytics' && (
          <div className="view-section animate-fade-in">
            {/* Metric widgets */}
            <div className="analytics-grid">
              <div className="glass-panel analytic-metric-card">
                <span className="metric-label">Cumulative Savings</span>
                <span className="metric-value" style={{ color: 'var(--success)' }}>
                  ${savingsStats.cumulativeSavings.toFixed(2)}
                </span>
              </div>
              <div className="glass-panel analytic-metric-card">
                <span className="metric-label">Total spent</span>
                <span className="metric-value">${savingsStats.totalSpent.toFixed(2)}</span>
              </div>
              <div className="glass-panel analytic-metric-card">
                <span className="metric-label">Average savings</span>
                <span className="metric-value">${savingsStats.averageSavings.toFixed(2)}</span>
              </div>
              <div className="glass-panel analytic-metric-card">
                <span className="metric-label">Grocery trips</span>
                <span className="metric-value">{savingsStats.totalShops}</span>
              </div>
            </div>

            {/* Savings SVG Line Chart */}
            {savingsStats.history.length > 0 && (
              <div className="glass-panel chart-card">
                <div className="chart-header">
                  <div>
                    <h3 style={{ fontSize: '1.1rem' }}>Savings Progression</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log of money saved over successive shops</p>
                  </div>
                  <span className="badge badge-success">Flybuys & Rewards Optimized</span>
                </div>
                {renderSavingsChart()}
              </div>
            )}

            {/* Savings History Logs Table */}
            <div className="glass-panel breakdown-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Historical Savings Log</h3>
              <div className="breakdown-table-wrapper">
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Store Visited</th>
                      <th>Total Spent</th>
                      <th>Money Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsStats.history.slice().reverse().map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{log.Date}</td>
                        <td>
                          <span className={`badge ${log.Store === 'Coles' ? 'badge-special' : (log.Store === 'Woolworths' ? 'badge-success' : 'badge-warning')}`} style={{ fontSize: '0.7rem' }}>
                            {log.Store}
                          </span>
                        </td>
                        <td>${log.TotalSpent.toFixed(2)}</td>
                        <td className="best-price-highlight">+${log.AmountSaved.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab content: User preferences settings */}
        {activeTab === 'settings' && (
          <div className="view-section animate-fade-in">
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                Grocery Optimization Settings
              </h3>
              
              <form className="settings-form" onSubmit={handleSavePreferences}>

                {/* City / Region */}
                <div className="slider-group" style={{ marginBottom: '24px' }}>
                  <div className="slider-labels" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} style={{ color: 'var(--blue-600)' }} /> Your City / Region
                    </label>
                  </div>
                  <select
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)', cursor: 'pointer' }}
                    value={preferences.region || 'Melbourne'}
                    onChange={(e) => setPreferences({ ...preferences, region: e.target.value })}
                  >
                    <option value="Melbourne">Melbourne, VIC</option>
                    <option value="Sydney">Sydney, NSW</option>
                    <option value="Brisbane">Brisbane, QLD</option>
                    <option value="Perth">Perth, WA</option>
                    <option value="Adelaide">Adelaide, SA</option>
                    <option value="Gold Coast">Gold Coast, QLD</option>
                    <option value="Canberra">Canberra, ACT</option>
                    <option value="Hobart">Hobart, TAS</option>
                    <option value="Darwin">Darwin, NT</option>
                  </select>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Only stores with branches in your city will appear in recommendations
                  </span>
                </div>
                
                {/* Home Address */}
                <div className="slider-group" style={{ marginBottom: '24px' }}>
                  <div className="slider-labels" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} style={{ color: 'var(--blue-600)' }} /> Home Address (for Google Maps directions)
                    </label>
                  </div>
                  <input 
                    type="text" 
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)' }}
                    placeholder="Enter suburb or address (e.g. Richmond VIC)"
                    value={preferences.homeAddress || ''}
                    onChange={(e) => setPreferences({ ...preferences, homeAddress: e.target.value })}
                  />
                </div>

                {/* Distance Coles */}
                <div className="slider-group">
                  <div className="slider-labels">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Navigation size={14} /> Distance to Coles
                    </label>
                    <span style={{ fontWeight: 700 }}>{preferences.distanceToColesKm} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="15" 
                    step="0.1"
                    className="pref-slider"
                    value={preferences.distanceToColesKm}
                    onChange={(e) => setPreferences({ ...preferences, distanceToColesKm: parseFloat(e.target.value) })}
                  />
                </div>

                {/* Distance Woolworths */}
                <div className="slider-group">
                  <div className="slider-labels">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Navigation size={14} /> Distance to Woolworths
                    </label>
                    <span style={{ fontWeight: 700 }}>{preferences.distanceToWoolworthsKm} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="15" 
                    step="0.1"
                    className="pref-slider"
                    value={preferences.distanceToWoolworthsKm}
                    onChange={(e) => setPreferences({ ...preferences, distanceToWoolworthsKm: parseFloat(e.target.value) })}
                  />
                </div>

                {/* Fuel Cost per km */}
                <div className="slider-group">
                  <div className="slider-labels">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Fuel size={14} /> Fuel / Transit Cost per km
                    </label>
                    <span style={{ fontWeight: 700 }}>${preferences.fuelCostPerKm.toFixed(2)} / km</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.50" 
                    step="0.01"
                    className="pref-slider"
                    value={preferences.fuelCostPerKm}
                    onChange={(e) => setPreferences({ ...preferences, fuelCostPerKm: parseFloat(e.target.value) })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Calculates travel overhead: 2x distance x fuel rate per store trip
                  </span>
                </div>

                {/* Loyalty memberships toggles */}
                <div className="form-group" style={{ gap: '10px' }}>
                  <label className="form-label">Loyalty Memberships</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={preferences.hasFlybuys} 
                        onChange={(e) => setPreferences({ ...preferences, hasFlybuys: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>I have a Coles Flybuys Card (0.5% point rebate + bonus points)</span>
                    </label>
                  </div>
                  <div className="checkbox-group" style={{ marginTop: '4px' }}>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={preferences.hasEverydayRewards} 
                        onChange={(e) => setPreferences({ ...preferences, hasEverydayRewards: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>I have an Everyday Rewards Card (0.5% point rebate + bonus points)</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'fit-content', padding: '12px 28px', marginTop: '8px' }}>
                  {loading ? 'Saving Settings...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Recommendations Tab ───────────────────────────────────────────── */}
        {activeTab === 'recommendations' && (
          <div className="view-section animate-fade-in">
            {recommendationsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px' }}>Running store analysis…</p>
              </div>
            ) : storeRecommendations ? (
              <div className="recommendations-tab">

                {/* Trade-Off Banner */}
                {storeRecommendations.tradeOffNarrative && (
                  <div className="tradeoff-banner glass-panel animate-slide-up">
                    <Sparkles size={20} style={{ color: 'var(--blue-600)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Smart Trade-Off Analysis</div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-charcoal)' }}>{storeRecommendations.tradeOffNarrative}</p>
                    </div>
                  </div>
                )}

                {/* Recommended Shops */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Trophy size={20} style={{ color: 'var(--blue-600)' }} />
                    <h3 style={{ margin: 0 }}>Recommended Shops</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Personalized store recommendations categorized by recurring item savings, overall average cost, and proximity.
                  </p>
                  
                  <div className="recommendations-categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {renderCategoryCard(storeRecommendations.cheapestWeighted, "Cheapest Shop (Recurring)", "🏆", "var(--success)")}
                    {renderCategoryCard(storeRecommendations.cheapestUnweighted, "Cheapest Overall (Average)", "💰", "var(--blue-500)")}
                    {renderCategoryCard(storeRecommendations.nearestStore, "Nearest Shop", "📍", "var(--purple-500)")}
                  </div>
                </div>

                {/* Itemized Price Comparison Table for Recommended Shops */}
                {storeRecommendations.itemComparisons && storeRecommendations.itemComparisons.length > 0 ? (
                  <div className="glass-panel breakdown-card">
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison — Recommended Shops</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Price comparison for your most-purchased items across all recommended stores. Cheapest price per item is highlighted.
                    </p>
                    <div className="breakdown-table-wrapper">
                      <table className="breakdown-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            {storeRecommendations.topByWeightedSavings.map(s => (
                              <th key={s.storeName}>{getStoreDisplayName(s.storeName)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {storeRecommendations.itemComparisons.map((item, idx) => {
                            const cheapest = item.cheapestStore;
                            return (
                              <tr key={idx}>
                                <td>
                                  <span style={{ fontWeight: 600 }}>{item.productName}</span>
                                </td>
                                {storeRecommendations.topByWeightedSavings.map(s => {
                                  const priceData = item.storePrices?.[s.storeName];
                                  const isCheapest = s.storeName === cheapest;
                                  return (
                                    <td key={s.storeName}>
                                      {priceData ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span className={isCheapest ? 'best-price-highlight' : ''}>
                                            ${priceData.price.toFixed(2)}
                                          </span>
                                          {priceData.packageSize && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                              {priceData.packageSize}
                                            </span>
                                          )}
                                          {priceData.isSpecial && (
                                            <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>
                                              {priceData.specialDetails || 'Special'}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel breakdown-card">
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison — Recommended Shops</h3>
                    <div className="breakdown-table-wrapper">
                      <table className="breakdown-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            {storeRecommendations.topByWeightedSavings.map(s => (
                              <th key={s.storeName}>{getStoreDisplayName(s.storeName)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {storeRecommendations.productRankings.slice(0, 8).map((p, idx) => {
                            const storeNames = storeRecommendations.topByWeightedSavings.map(s => s.storeName);
                            return (
                              <tr key={idx}>
                                <td><span style={{ fontWeight: 600 }}>{p.productName}</span></td>
                                {storeNames.map(sn => {
                                  const isWinner = storeRecommendations.topByWeightedSavings
                                    .find(s => s.storeName === sn)?.winningProducts
                                    ?.some(wp => wp.toLowerCase().includes(p.productName.toLowerCase().split(' ')[0]));
                                  return (
                                    <td key={sn}>
                                      <span className={isWinner ? 'best-price-highlight' : ''} style={{ fontSize: '0.82rem' }}>
                                        {isWinner ? 'Best' : '—'}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Product Rankings breakdown */}
                <div className="glass-panel" style={{ marginTop: '24px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Star size={18} style={{ color: 'var(--blue-600)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Your Product Purchase Rankings</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Based on your shopping history. Equal frequency = same rank. Rank 1 drives the recommendation most.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {storeRecommendations.productRankings.slice(0, 8).map(p => (
                      <div key={p.productName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--blue-50)', borderRadius: '8px', border: '1px solid var(--divider)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`rank-badge rank-badge--${Math.min(p.rank, 5)}`}>#{p.rank}</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-charcoal)' }}>{p.productName}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.occurrences} purchase{p.occurrences !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '16px', fontSize: '0.85rem', height: '36px', padding: '0 16px' }}
                    onClick={loadStoreRecommendations}
                    disabled={recommendationsLoading}
                  >
                    <RefreshCw size={14} /> Refresh Analysis
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                <Trophy size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Upload receipts to generate your personalised store ranking.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
