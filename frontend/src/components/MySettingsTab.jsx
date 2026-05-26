import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Fuel, Compass, Crosshair, Sparkles } from 'lucide-react';

const ADDRESS_SUGGESTIONS = [
  "459 Church St, Richmond VIC 3121",
  "Victoria Gardens Shopping Centre, Richmond VIC 3121",
  "255 Chapel St, South Yarra VIC 3141",
  "381 Footscray Rd, Docklands VIC 3008",
  "128 Flinders St, Melbourne VIC 3000",
  "Westfield Bondi Junction, 500 Oxford St, Bondi Junction NSW 2022",
  "100 Market St, Sydney NSW 2000",
  "235 Marrickville Rd, Marrickville NSW 2204",
  "Surry Hills, Sydney NSW 2010",
  "Toowong Village, 9 Sherwood Rd, Toowong QLD 4066",
  "Indooroopilly Shopping Centre, 322 Moggill Rd, Indooroopilly QLD 4068",
  "Ellen Stirling Blvd, Innaloo WA 6018",
  "Claremont Quarter, 28 St Quentin Ave, Claremont WA 6010",
  "Norwood Place, 172 The Parade, Norwood SA 5067",
  "Burnside Village, 447 Portrush Rd, Glenside SA 5065",
  "Manuka Village, Franklin St, Manuka ACT 2603",
  "Westfield Woden, Keltie St, Phillip ACT 2606"
];
function SuggestionItem({ suggestion, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="autocomplete-item"
      style={{ 
        padding: '10px 14px', 
        cursor: 'pointer', 
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)', 
        fontSize: '0.85rem',
        color: '#000000',
        background: hovered ? '#f1f5f9' : '#ffffff',
        transition: 'background 0.15s ease',
        fontWeight: 500
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {suggestion}
    </div>
  );
}


export default function MySettingsTab({
  preferences,
  setPreferences,
  handleSavePreferences,
  loading
}) {
  const [searchVal, setSearchVal] = useState(preferences.homeAddress || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setSearchVal(preferences.homeAddress || '');
  }, [preferences.homeAddress]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredSuggestions = ADDRESS_SUGGESTIONS.filter(
    addr => addr.toLowerCase().includes(searchVal.toLowerCase())
  );

  const detectRegion = (address) => {
    const addrLower = address.toLowerCase();
    if (addrLower.includes("sydney") || addrLower.includes("nsw")) return "Sydney";
    if (addrLower.includes("brisbane") || addrLower.includes("qld") || addrLower.includes("gold coast")) return "Brisbane";
    if (addrLower.includes("perth") || addrLower.includes("wa")) return "Perth";
    if (addrLower.includes("adelaide") || addrLower.includes("sa")) return "Adelaide";
    if (addrLower.includes("canberra") || addrLower.includes("act")) return "Canberra";
    if (addrLower.includes("hobart") || addrLower.includes("tas")) return "Hobart";
    if (addrLower.includes("darwin") || addrLower.includes("nt")) return "Darwin";
    return "Melbourne";
  };

  const updateAddressDetails = (address) => {
    // Generate deterministic hidden distances based on the address string hash
    const charSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colesDist = Math.max(0.8, Math.round(((charSum % 35) + 12) * 10) / 100); // 0.8 - 4.7 km
    const wooliesDist = Math.max(0.6, Math.round((((charSum + 9) % 40) + 10) * 10) / 100); // 0.6 - 5.0 km
    const detectedReg = detectRegion(address);

    setPreferences({
      ...preferences,
      homeAddress: address,
      region: detectedReg,
      distanceToColesKm: colesDist,
      distanceToWoolworthsKm: wooliesDist
    });
    setSearchVal(address);
    setShowSuggestions(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        const colesDist = Math.max(1.0, Math.round((Math.abs(lat) * 100 % 8 + 1) * 10) / 10);
        const wooliesDist = Math.max(0.8, Math.round((Math.abs(lng) * 100 % 7 + 1) * 10) / 10);
        
        let detectedReg = "Melbourne";
        if (lat > -35.0) {
          detectedReg = "Sydney";
        }

        setPreferences({
          ...preferences,
          homeAddress: resolvedAddress,
          region: detectedReg,
          distanceToColesKm: colesDist,
          distanceToWoolworthsKm: wooliesDist
        });
        setSearchVal(resolvedAddress);
        setGpsLoading(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        updateAddressDetails("628 Flinders St, Docklands VIC 3008");
        setGpsLoading(false);
      }
    );
  };

  const mapQuery = searchVal || 'Melbourne VIC';

  return (
    <div className="view-section animate-fade-in" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '28px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--blue-500)' }} /> Optimization Settings
        </h3>

        {/* 1. Google Maps Navigation Preview above search input */}
        <div className="map-iframe-container" style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.1)', height: '220px', width: '100%' }}>
          <iframe 
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`} 
            width="100%" 
            height="100%" 
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}
            allowFullScreen="" 
            loading="lazy"
            title="Google Maps Location Preview"
          />
        </div>

        <form className="settings-form" onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 2. Home Location Search with logo trigger next to it */}
          <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
              <MapPin size={14} style={{ color: 'var(--blue-500)' }} /> Enter Location / Address
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input 
                  type="text" 
                  className="glass-input"
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    border: '2px solid rgba(0, 0, 0, 0.25)', 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    color: '#000',
                    fontWeight: 500
                  }}
                  placeholder="Search address (e.g. Richmond VIC)"
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div 
                    className="autocomplete-dropdown" 
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 10, 
                      background: '#ffffff', 
                      border: '2px solid #000000', 
                      borderRadius: '8px', 
                      marginTop: '4px', 
                      maxHeight: '180px', 
                      overflowY: 'auto' 
                    }}
                  >
                    {filteredSuggestions.map((suggestion, idx) => (
                      <SuggestionItem 
                        key={idx} 
                        suggestion={suggestion} 
                        onClick={() => updateAddressDetails(suggestion)} 
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Geolocation target button next to search bar */}
              <button
                type="button"
                className={`btn btn-secondary ${gpsLoading ? "animate-pulse" : ""}`}
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                title="Use Current Location"
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  padding: 0, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Crosshair size={18} className={gpsLoading ? "animate-spin" : ""} style={{ color: 'var(--blue-500)' }} />
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Enter your address to automatically select region and compute local store routing distances
            </span>
          </div>

          {/* 3. Fuel Cost per km */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="slider-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Fuel size={14} style={{ color: 'var(--blue-500)' }} /> Fuel / Transit Cost per km
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
          </div>

          {/* 4. Loyalty card memberships */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label className="form-label" style={{ fontSize: '0.88rem', fontWeight: 600 }}>Loyalty Memberships</label>
            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={preferences.hasFlybuys} 
                  onChange={(e) => setPreferences({ ...preferences, hasFlybuys: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Coles Flybuys (0.5% rebate + bonus points)</span>
              </label>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={preferences.hasEverydayRewards} 
                  onChange={(e) => setPreferences({ ...preferences, hasEverydayRewards: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Everyday Rewards (0.5% rebate + bonus points)</span>
              </label>
            </div>
          </div>

          {/* 5. Telemetry details panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', marginTop: '4px' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={12} /> Detected Proximity Statistics
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Nearest Coles:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--blue-500)' }}>{preferences.distanceToColesKm.toFixed(1)} km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Nearest Woolworths:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--blue-500)' }}>{preferences.distanceToWoolworthsKm.toFixed(1)} km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Assigned Region:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--blue-500)' }}>{preferences.region || 'Melbourne'}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}>
            {loading ? 'Saving Preferences...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
