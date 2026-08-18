import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Search, Calendar, Clock, Activity, LogIn, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import wordMap from './wordMap.json';

// word_XXXX 및 aac_XXXX 코드를 실제 한글 단어/AAC 문장으로 변환하는 헬퍼 함수
function formatActivityLog(actText) {
  if (!actText) return '';
  return actText.replace(/(word|aac)_\d+/g, (matchedCode) => {
    const koreanText = wordMap[matchedCode];
    return koreanText ? `${koreanText} (${matchedCode})` : matchedCode;
  });
}

const ENV_PRESETS = [
  { label: '🚀 Prod (운영)', value: 'https://api.cocoschool.me/api/v1', env: 'prod' },
  { label: '🧪 Staging (스테이징)', value: 'https://staging-api.cocoschool.me/api/v1', env: 'staging' },
  { label: '🛠️ Dev (개발)', value: 'https://desktop-c48da56.tail9ee492.ts.net/api/v1', env: 'dev' },
  { label: '⚙️ 직접 입력 (Custom)', value: 'custom', env: 'custom' },
];

export default function App() {
  const [selectedEnv, setSelectedEnv] = useState(() => {
    return localStorage.getItem('coco_admin_selected_env') || 'https://api.cocoschool.me/api/v1';
  });
  const [baseUrl, setBaseUrl] = useState(() => {
    const saved = localStorage.getItem('coco_admin_selected_env');
    return (saved && saved !== 'custom') ? saved : (localStorage.getItem('coco_admin_base_url') || 'https://api.cocoschool.me/api/v1');
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('● 서버 대기 중');
  const [statusColor, setStatusColor] = useState('var(--warning)');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('coco_admin_token') || '');
  const [adminEmail, setAdminEmail] = useState(localStorage.getItem('coco_admin_email') || '');
  
  // UI Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('exxd2@naver.com');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Daily Stats Modal
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});

  useEffect(() => {
    loadUsersData();
  }, [baseUrl, adminToken]);

  const handleEnvChange = (e) => {
    const value = e.target.value;
    setSelectedEnv(value);
    localStorage.setItem('coco_admin_selected_env', value);
    if (value !== 'custom') {
      setBaseUrl(value);
      localStorage.setItem('coco_admin_base_url', value);
    }
  };

  const loadUsersData = async () => {
    setLoading(true);
    setConnectionStatus('🔄 서버 연결 중...');
    setStatusColor('var(--warning)');

    try {
      let targetUrl = baseUrl.endsWith('/') ? `${baseUrl}users/` : `${baseUrl}/users/`;
      if (targetUrl.includes('users//')) targetUrl = targetUrl.replace('users//', 'users/');

      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('coco_admin_token') || adminToken;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(targetUrl, { method: 'GET', headers });

      if (res.status === 401 || res.status === 403) {
        setConnectionStatus('🔴 어드민 인증 필요');
        setStatusColor('#ef4444');
        setShowLoginModal(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setConnectionStatus(`🟢 어드민 연동 완료 (${data.length}명)`);
        setStatusColor('var(--success)');
      }
    } catch (err) {
      console.warn('API fetch failed:', err);
      setConnectionStatus(`🔴 연동 실패: ${err.message}`);
      setStatusColor('#ef4444');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', loginEmailInput);
      formData.append('password', loginPasswordInput);

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || '로그인 실패');
      }

      const data = await res.json();
      if (data.user_type !== 'admin') {
        throw new Error('어드민 권한(admin) 계정만 로그인 가능합니다.');
      }

      const token = data.access_token;
      setAdminToken(token);
      setAdminEmail(loginEmailInput);
      localStorage.setItem('coco_admin_token', token);
      localStorage.setItem('coco_admin_email', loginEmailInput);

      setShowLoginModal(false);
      loadUsersData();
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const openDailyStatsModal = async (user) => {
    setSelectedUser(user);
    setShowStatsModal(true);
    setStatsLoading(true);
    setDailyStats([]);
    setExpandedSessions({});

    try {
      const token = localStorage.getItem('coco_admin_token') || adminToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let statsUrl = baseUrl.endsWith('/') ? `${baseUrl}users/${user.id}/daily-stats` : `${baseUrl}/users/${user.id}/daily-stats`;
      const res = await fetch(statsUrl, { headers });

      if (res.status === 401 || res.status === 403) {
        setShowStatsModal(false);
        setShowLoginModal(true);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setDailyStats(data.daily_stats || []);
      }
    } catch (err) {
      console.error('Stats fetch failed:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const toggleSessionLog = (key) => {
    setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter and Sort Users
  const filteredUsers = users
    .filter(u => {
      const q = searchQuery.toLowerCase();
      return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  // KPI Calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const totalUsers = users.length;
  const activeToday = users.filter(u => u.lastLogin && u.lastLogin.startsWith(todayStr)).length;
  const adminCount = users.filter(u => u.user_type === 'admin').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent)', padding: '0.6rem', borderRadius: '12px', color: 'white', display: 'flex' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>CocoEcho Admin</h1>
              <span style={{ fontSize: '0.85rem', background: '#fbbf24', color: '#0f172a', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 900 }}>v0.2.0</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>유저 접속 현황 & 플레이 세션 실시간 모니터링</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {adminEmail && (
            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              👤 {adminEmail} (어드민)
            </div>
          )}
          <button onClick={() => setShowLoginModal(true)} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={16} /> 어드민 로그인
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-dark)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>환경:</span>
            <select
              value={selectedEnv}
              onChange={handleEnvChange}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {ENV_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            {selectedEnv === 'custom' && (
              <input
                type="text"
                value={baseUrl}
                placeholder="https://..."
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  localStorage.setItem('coco_admin_base_url', e.target.value);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  width: '200px',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  outline: 'none'
                }}
              />
            )}
            <button onClick={loadUsersData} style={{ background: 'var(--border-color)', border: 'none', color: 'var(--text-main)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> 동기화
            </button>
          </div>
        </div>
      </header>

      {/* Connection Notice */}
      <div style={{ background: 'var(--bg-card)', padding: '0.8rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          💡 <strong>서버 연동</strong>: <code>{baseUrl}</code> 환경의 유저 접속 및 플레이 세션 데이터를 실시간 모니터링합니다.
        </span>
        <span style={{ fontWeight: 700, color: statusColor }}>{connectionStatus}</span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>총 회원 가입자</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8' }}>{totalUsers} 명</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>오늘 접속 유저</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{activeToday} 명</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>어드민 계정</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e' }}>{adminCount} 계정</div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>👤 유저별 접속 및 플레이 상세 정보</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px', outline: 'none' }}>
              <option value="desc">⏱️ 최근 로그인순 (최신순)</option>
              <option value="asc">⏱️ 오래된 로그인순</option>
            </select>
            <div style={{ position: 'relative' }}>
              <input type="text" placeholder="유저 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 0.8rem 0.5rem 2.2rem', borderRadius: '8px', outline: 'none', width: '220px' }} />
              <Search size={16} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>유저 정보</th>
                <th style={{ padding: '0.75rem 1rem' }}>계정 유형</th>
                <th style={{ padding: '0.75rem 1rem' }}>가입 일시</th>
                <th style={{ padding: '0.75rem 1rem' }}>최근 로그인 일시</th>
                <th style={{ padding: '0.75rem 1rem' }}>플레이 데이터</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    조회된 유저 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700 }}>{user.name || '이름없음'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, background: user.user_type === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)', color: user.user_type === 'admin' ? '#fca5a5' : '#a5b4fc' }}>
                        {user.user_type || 'user'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button onClick={() => openDailyStatsModal(user)} style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--accent)', color: '#a5b4fc', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={14} /> 📅 일별 플레이 통계
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🔒 어드민 관리자 로그인</h3>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>관리자 이메일</label>
                <input type="email" value={loginEmailInput} onChange={(e) => setLoginEmailInput(e.target.value)} required style={{ width: '100%', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem 0.8rem', color: 'var(--text-main)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>비밀번호</label>
                <input type="password" value={loginPasswordInput} onChange={(e) => setLoginPasswordInput(e.target.value)} required style={{ width: '100%', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem 0.8rem', color: 'var(--text-main)', outline: 'none' }} />
              </div>
              {loginError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{loginError}</div>}
              <button type="submit" style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>로그인 및 JWT 발급</button>
            </form>
          </div>
        </div>
      )}

      {/* Daily Stats Modal */}
      {showStatsModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', width: '90%', maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>📅 {selectedUser.name} 유저의 날짜별 플레이 통계</h3>
              <button onClick={() => setShowStatsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>데이터를 불러오는 중입니다...</div>
            ) : dailyStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>해당 유저의 게임 플레이 기록이 없습니다.</div>
            ) : (
              dailyStats.map(day => (
                <div key={day.date} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '1rem' }}>📅 {day.date}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      오늘 총 체류: <strong style={{ color: '#34d399' }}>⏱️ {day.total_play_minutes} 분</strong> (세션 {day.sessions.length}개 / 총 {day.total_action_count}회 활동)
                    </span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.5rem' }}>세션</th>
                        <th style={{ padding: '0.5rem' }}>🔑 로그인 시각</th>
                        <th style={{ padding: '0.5rem' }}>🏁 마지막 활동 시각</th>
                        <th style={{ padding: '0.5rem' }}>체류/플레이 시간</th>
                        <th style={{ padding: '0.5rem' }}>활동 수 & 상세로그</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.sessions.map((s, idx) => {
                        const drawerKey = `${day.date}_${idx}`;
                        const isExpanded = expandedSessions[drawerKey];
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.6rem', fontWeight: 600 }}>세션 #{idx + 1}</td>
                              <td style={{ padding: '0.6rem', color: '#a5b4fc', fontWeight: 600 }}>{s.login_time || '-'}</td>
                              <td style={{ padding: '0.6rem', color: '#a5b4fc' }}>{s.last_activity_time || '-'}</td>
                              <td style={{ padding: '0.6rem', color: '#34d399', fontWeight: 700 }}>⏱️ {s.duration_minutes} 분</td>
                              <td style={{ padding: '0.6rem' }}>
                                <span style={{ marginRight: '0.5rem' }}>🎮 {s.action_count} 회</span>
                                {s.activities && s.activities.length > 0 && (
                                  <button onClick={() => toggleSessionLog(drawerKey)} style={{ background: isExpanded ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)', border: isExpanded ? '1px solid #ef4444' : '1px solid var(--accent)', color: isExpanded ? '#fca5a5' : '#a5b4fc', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                    {isExpanded ? '❌ 닫기' : '📜 상세 로그 보기'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && s.activities && (
                              <tr>
                                <td colSpan="5" style={{ padding: '0.85rem 1.1rem', background: '#0f172a', border: '1px solid #475569', borderLeft: '4px solid #6366f1', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.3rem' }}>
                                    <span>🔍 세션 #{idx + 1} 활동 상세 로그 ({s.activities.length}개 항목)</span>
                                    <button onClick={() => toggleSessionLog(drawerKey)} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>❌ 닫기</button>
                                  </div>
                                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {s.activities.map((act, i) => (
                                      <li key={i} style={{ lineHeight: 1.4, fontWeight: 500 }}>{formatActivityLog(act)}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
