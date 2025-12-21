import React, { useState, useEffect, useRef } from 'react';
import { LucideUtensils, LucideCoffee, LucidePersonStanding, LucideShoppingBag, LucideBed, LucideMapPin, LucidePlus, LucideListChecks, LucideSparkles, LucideSettings, LucideSend, LucideX, LucideSearch, LucideLightbulb, LucideHistory } from 'lucide-react';

// --- 초기 데이터 ---
const INITIAL_TRIP_DATA = {
  tripInfo: {
    title: "2026 강릉 가족 힐링 여행",
    dates: "2026.01.07 - 01.08",
    stay: "신라 모노그램 강릉",
    family: "아빠(커피), 엄마(토속음식), 6세 딸(동물/액티비티)"
  },
  itinerary: [
    {
      day: 1,
      date: "1월 7일 (화)",
      schedule: [
        { id: "d1-lunch", time: "12:00", category: "meal", isFixed: true, mission: false, selectedOptionIndex: 0, options: [{ title: "초당 순두부 마을", desc: "엄마는 얼큰 전골, 딸은 하얀 순두부", tags: ["토속적", "아이추천"], place: "차현희순두부 or 초당할머니순두부" }] },
        { id: "d1-snack", time: "13:30", category: "shopping", isFixed: true, mission: true, selectedOptionIndex: 0, options: [{ title: "강릉샌드 초당직영점", desc: "⚠️ 품절 방지! 미리 구매 권장", tags: ["미션필수", "선물"], place: "초당동 직영점" }] },
        { id: "d1-coffee", time: "14:00", category: "coffee", isFixed: false, mission: false, selectedOptionIndex: 0, options: [
          { title: "보헤미안 박이추 커피", desc: "대한민국 1세대 명장의 핸드드립", tags: ["아빠추천", "장인정신"] },
          { title: "바우카페 (본점)", desc: "툇마루 어머니 운영, 흑임자라떼", tags: ["웨이팅없음", "시그니처"] },
          { title: "카페 기와", desc: "고즈넉한 한옥 감성", tags: ["엄마추천", "분위기"] }
        ]},
        { id: "d1-checkin", time: "16:00", category: "stay", isFixed: true, mission: false, selectedOptionIndex: 0, options: [{ title: "신라 모노그램 체크인", desc: "온수풀 수영 (3부 이용 추천)", tags: ["호텔", "수영"], place: "송정동" }] },
        { id: "d1-market", time: "18:30", category: "activity", isFixed: true, mission: true, selectedOptionIndex: 0, options: [{ title: "강릉 중앙시장", desc: "베니닭강정, 어묵고로케 필수", tags: ["시장구경", "미션필수"], place: "성남동" }] },
      ]
    },
    {
      day: 2,
      date: "1월 8일 (수)",
      schedule: [
        { id: "d2-activity", time: "10:00", category: "activity", isFixed: false, mission: false, selectedOptionIndex: 0, options: [{ title: "자연아놀자", desc: "실내 생태체험, 동물 먹이주기", tags: ["아이최애", "실내"] }, { title: "경포 아쿠아리움", desc: "따뜻한 실내 관람", tags: ["실내", "교육적"] }] },
        { id: "d2-lunch", time: "12:30", category: "meal", isFixed: false, mission: false, selectedOptionIndex: 0, options: [{ title: "포남사골옹심이", desc: "안 매운 쫀득 옹심이", tags: ["토속적", "안매움"] }, { title: "강릉 불고기", desc: "달콤 파불고기", tags: ["아이밥도둑", "가족식사"] }] },
        { id: "d2-coffee", time: "14:30", category: "coffee", isFixed: false, mission: false, selectedOptionIndex: 0, options: [{ title: "테라로사 본점", desc: "웅장한 커피 공장", tags: ["아빠필수", "웅장함"] }, { title: "테라로사 경포호수", desc: "호수 뷰 북카페", tags: ["아이동반", "여유"] }] },
      ]
    }
  ]
};

export default function App() {
  const [trip, setTrip] = useState(INITIAL_TRIP_DATA);
  const [currentDay, setCurrentDay] = useState(0);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: '안녕하세요! 강릉 여행 전문가 AI 비서입니다. 무엇을 도와드릴까요? 🤖' }]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiTip, setAiTip] = useState({ show: false, content: "" });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'meal': return <LucideUtensils size={18} />;
      case 'coffee': return <LucideCoffee size={18} />;
      case 'activity': return <LucidePersonStanding size={18} />;
      case 'shopping': return <LucideShoppingBag size={18} />;
      case 'stay': return <LucideBed size={18} />;
      default: return <LucideMapPin size={18} />;
    }
  };

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'meal': return 'bg-orange-100 text-orange-600';
      case 'coffee': return 'bg-amber-100 text-amber-700';
      case 'activity': return 'bg-green-100 text-green-600';
      case 'shopping': return 'bg-pink-100 text-pink-600';
      case 'stay': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const callGemini = async (prompt, systemInstruction) => {
    if (!apiKey) throw new Error("API_KEY_MISSING");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
      })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const msg = userInput;
    setUserInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);

    try {
      const system = `당신은 강릉 여행 전문가입니다. 다음 일정 데이터를 참고하여 답변하세요: ${JSON.stringify(trip.itinerary)}`;
      const aiResponse = await callGemini(msg, system);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', text: e.message === "API_KEY_MISSING" ? "⚠️ 설정에서 Gemini API 키를 먼저 입력해주세요." : "오류가 발생했습니다. 다시 시도해주세요." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const showTip = async (title, desc) => {
    setAiTip({ show: true, content: "생성 중..." });
    try {
      const prompt = `'${title}'(${desc}) 방문 시 6세 딸이 있는 가족을 위한 짧은 꿀팁 1개만 알려줘.`;
      const tip = await callGemini(prompt, "강릉 여행 가이드");
      setAiTip({ show: true, content: tip });
    } catch (e) {
      setAiTip({ show: true, content: e.message === "API_KEY_MISSING" ? "설정에서 API 키를 입력하면 AI 꿀팁을 볼 수 있습니다." : "오류가 발생했습니다." });
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden font-sans">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 rounded-b-[2rem] shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{trip.tripInfo.title}</h1>
          <button onClick={() => setShowSettings(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <LucideSettings size={20} />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <span className="text-[10px] bg-blue-500/50 px-2 py-1 rounded-full whitespace-nowrap border border-blue-400">👨 아빠: 커피</span>
            <span className="text-[10px] bg-pink-500/50 px-2 py-1 rounded-full whitespace-nowrap border border-pink-400">👩 엄마: 토속</span>
            <span className="text-[10px] bg-yellow-500/50 px-2 py-1 rounded-full whitespace-nowrap border border-yellow-400 text-yellow-900 font-bold">👧 딸: 동물</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-4 gap-3 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30">
        {[0, 1].map(idx => (
          <button 
            key={idx}
            onClick={() => setCurrentDay(idx)}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${currentDay === idx ? 'bg-blue-600 text-white scale-105' : 'bg-white text-gray-400'}`}
          >
            Day {idx + 1} ({trip.itinerary[idx].date.split('(')[1].replace(')', '')})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-6 pb-24 relative">
        <div className="absolute left-[73px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
        {trip.itinerary[currentDay].schedule.map((item, idx) => {
          const selected = item.options[item.selectedOptionIndex];
          return (
            <div key={item.id} className="relative pl-20 pb-8 group">
              <div className="absolute left-[66px] top-1 w-4 h-4 rounded-full border-4 border-blue-500 bg-white z-10"></div>
              <span className="absolute left-0 top-0 text-xs font-bold text-gray-400 w-12 text-right pt-0.5">{item.time}</span>
              
              <div 
                onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(selected.title)}`, '_blank')}
                className={`bg-white rounded-3xl p-5 shadow-sm border border-transparent transition-all active:scale-95 ${item.mission ? 'border-red-200 ring-2 ring-red-50 ring-offset-0' : 'hover:shadow-md'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getCategoryColor(item.category)}`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 flex items-center gap-1">
                        {selected.title} <LucideSearch size={12} className="text-gray-300" />
                      </h3>
                      <p className="text-[10px] text-gray-400">{selected.place || '강릉 일대'}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{selected.desc}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">#{tag}</span>
                  ))}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); showTip(selected.title, selected.desc); }}
                  className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100"
                >
                  <LucideSparkles size={14} /> AI 꿀팁 보기
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button onClick={() => setShowSummary(true)} className="w-14 h-14 bg-gray-800 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-700 transition-all">
          <LucideListChecks size={24} />
        </button>
        <button onClick={() => setIsChatOpen(true)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all relative">
          <LucideSparkles size={24} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      </div>

      {/* Settings Modal (API KEY) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <LucideSettings className="text-blue-600" /> 설정
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              AI 기능을 사용하려면 Gemini API 키가 필요합니다. 코드를 배포해도 이 키는 브라우저에만 저장되므로 안전합니다.
            </p>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API 키를 입력하세요"
              className="w-full px-4 py-3 bg-slate-100 rounded-xl mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button 
              onClick={() => saveApiKey(apiKey)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              저장하기
            </button>
            <button onClick={() => setShowSettings(false)} className="w-full py-3 mt-2 text-gray-400 text-sm">닫기</button>
          </div>
        </div>
      )}

      {/* Chat UI */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white">
          <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><LucideSparkles /></div>
              <div>
                <p className="text-xs opacity-70">강릉 여행 전문가</p>
                <h3 className="font-bold">Gemini AI 비서</h3>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)}><LucideX size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-xs text-gray-400 animate-pulse">AI가 답변을 생각 중입니다...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-2xl"><LucideSend size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* AI Tip Popup */}
      {aiTip.show && (
        <div className="fixed inset-x-0 bottom-24 mx-6 z-50 bg-gray-900/95 text-white p-5 rounded-3xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
              <LucideLightbulb size={16} /> AI 꿀팁
            </div>
            <button onClick={() => setAiTip({ show: false, content: "" })}><LucideX size={16} /></button>
          </div>
          <p className="text-sm leading-relaxed text-gray-200">{aiTip.content}</p>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
              <LucideHistory className="text-blue-600" /> 전체 일정 요약
            </h2>
            {trip.itinerary.map(day => (
              <div key={day.day} className="mb-6">
                <h4 className="font-bold text-blue-600 mb-2">{day.date}</h4>
                <div className="space-y-3">
                  {day.schedule.map(s => (
                    <div key={s.id} className="flex gap-3 text-sm">
                      <span className="text-gray-400 font-mono w-10 shrink-0">{s.time}</span>
                      <span className="text-gray-700 font-medium">{s.options[s.selectedOptionIndex].title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setShowSummary(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold">확인 완료</button>
          </div>
        </div>
      )}
    </div>
  );
}
