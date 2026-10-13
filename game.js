/**
 * 행정법원 판사 시뮬레이터 (Administrative Law Court Simulator)
 * - 실제 대한민국 대법원 판례 및 행정법 이론 기반 게임 로직
 * - Web Audio API 내장 합성 사운드 (외부 파일 의존 없음)
 */

// 1. Web Audio API 사운드 엔진
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  // 법봉 타격 효과음 (Gavel Strike)
  playGavel() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 법봉 1타
    this._strikeSound(now);
    // 법봉 2타
    this._strikeSound(now + 0.22);
    // 법봉 3타 (최종 선고)
    this._strikeSound(now + 0.44, 1.2);
  }

  _strikeSound(time, intensity = 1.0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * intensity, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.15);

    gain.gain.setValueAtTime(0.7 * intensity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  // 정답 팡파레
  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + index * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  }

  // 오판/감점 경고음
  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
  }
}

// 2. 전문 행정법 판례 데이터베이스 (8개 핵심 사건)
const CASES_DATABASE = [
  {
    id: 1,
    type: "취소소송 (행정신뢰)",
    caseNo: "2024구합1021호",
    title: "폐기물처리업 불허가처분 취소청구의 소",
    facts: "원고(갑 회사)는 폐기물처리업을 하기 위해 관할 행정청에 사업계획서를 제출하여 '적정통보(사전결정)'를 받았습니다. 원고는 이 통보를 신뢰하여 10억 원 상당의 부지를 매입하고 전용 시설을 완공한 후 본허가를 신청했습니다. 그러나 구청장은 인근 주민들의 극심한 민원과 도시경관 훼손을 이유로 본허가를 불허가처분했습니다.",
    plaintiff: {
      name: "(주)청정환경 (원고)",
      argument: "행정청이 이미 적정통보라는 공적 견해를 표명했고, 이를 믿고 막대한 자본을 투자했는데 합당한 사정변경도 없이 불허가한 것은 '신뢰보호의 원칙'에 위배되어 위법합니다!"
    },
    defendant: {
      name: "녹색구청장 (피고)",
      argument: "적정통보는 예비심사일 뿐 확정적 허가가 아닙니다. 다수 주민의 환경권 및 쾌적한 주거환경 보호라는 중대한 공익이 우선하므로 적법한 재량권 행사입니다."
    },
    coreIssue: "행정청의 선행조치(적정통보)에 대한 사인의 신뢰가 보호받아야 하는가? 주민 민원이라는 공익이 신뢰이익을 번복할 정도로 중대한가?",
    correctPrinciple: "신뢰보호의 원칙",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "원고의 청구를 인용한다 (불허가처분을 취소한다)",
        desc: "행정청의 적정통보를 신뢰한 사인의 보호가치 있는 신뢰이익이 불허가 처분으로 달성하려는 공익보다 우선하므로 처분은 위법하다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다 (처분은 적법하다)",
        desc: "환경보호와 주민들의 쾌적한 주거복리라는 공익이 사인의 사적 투자손실보다 현저히 중대하므로 구청장의 처분은 정당하다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "본 소송을 각하한다 (소송요건 흠결)",
        desc: "폐기물처리업 허가 여부는 순수한 행정청의 자유재량으로서 법원에 소송을 제기할 법률상 이익이 없다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 1998. 5. 8. 선고 97누12294 판결 [폐기물처리업사업계획부적정통보처분취소 등]",
      summary: "“행정청이 사업계획 적정통보를 한 후, 사업자가 그에 따라 막대한 시설투자를 하였음에도 단순한 주민들의 반대 민원만을 이유로 본허가를 거부하는 것은 신뢰보호의 원칙에 반하여 재량권을 일탈·남용한 것으로서 위법하다.”",
      explanation: "신뢰보호원칙의 요건인 ① 공적 견해표명(적정통보), ② 귀책사유 없는 신뢰, ③ 신뢰에 기초한 처리행위(시설투자), ④ 반하는 처분(불허가)이 모두 인정됩니다. 공익과 사익의 이익형량에서 단순 주민 민원은 신뢰를 번복할 공익상 필요로 인정되지 않았습니다."
    }
  },
  {
    id: 2,
    type: "취소소송 (대상적격)",
    caseNo: "2024구합2053호",
    title: "건축신고 반려행위 취소청구의 소",
    facts: "건축주 을은 법정 요건을 갖추어 관할 군수에게 인허가의제 효과를 수반하지 않는 일반 건축신고서를 제출했습니다. 군수는 주변 통행 불편 우려 등을 이유로 해당 건축신고를 '반려(수리거부)'했습니다. 을은 이에 불복하여 취소소송을 제기했습니다.",
    plaintiff: {
      name: "건축주 을 (원고)",
      argument: "신고가 반려되면 시공 시 무허가건축물로 처벌받거나 시정명령, 철거대집행 등 막대한 제재를 받게 되므로 반려행위는 국민의 권리의무에 영향을 미치는 처분입니다!"
    },
    defendant: {
      name: "평화군수 (피고)",
      argument: "신고는 도달로 효력이 생기는 자기완결적 행위일 뿐입니다. 반려행위는 단순한 사실의 통지에 불과하므로 항고소송의 대상인 '처분'이 아니며, 따라서 각하되어야 합니다."
    },
    coreIssue: "법령상 요건을 갖춘 신고에 대한 행정청의 '반려행위'가 항고소송의 대상인 '행정처분'에 해당하는가? (대상적격 유무)",
    correctPrinciple: "취소소송의 대상적격 (처분성)",
    options: [
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "본 소송을 각하한다 (대상적격 불비)",
        desc: "건축신고는 자기완결적 신고로서 반려가 있더라도 효력에 영향이 없으므로 항고소송의 대상이 되는 처분이 아니다."
      },
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "본안판단: 처분성을 인정하고 반려처분을 취소한다",
        desc: "건축신고 반려행위는 국민의 법적 불안을 초래하므로 항고소송의 대상인 처분이며, 적법한 신고를 부당하게 반려하였으므로 위법하다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "반려행위는 처분이지만 군수의 재량권 범위 내의 정당한 조치이므로 적법하다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 2011. 6. 10. 선고 2008두167 전원합의체 판결 [건축신고반려처분취소]",
      summary: "“건축신고가 반려될 경우 당사자는 시정명령·이행강제금·형사처벌의 위험에 직면하게 되므로, 이러한 법적 불안을 조기에 해소하기 위해 건축신고 반려행위는 항고소송의 대상이 되는 ‘처분’에 해당한다.”",
      explanation: "과거 판례는 자기완결적 신고의 반려는 처분이 아니라고 보았으나, 2011년 전원합의체 판결로 입장을 변경하여 국민의 실효적 권리구제를 위해 '처분성(대상적격)'을 명확히 긍정하였습니다."
    }
  },
  {
    id: 3,
    type: "취소소송 (행정법 일반원칙)",
    caseNo: "2024구합3319호",
    title: "제1종 보통·대형 운전면허 취소처분 취소청구의 소",
    facts: "운전자 병은 배기량 100cc 오토바이(원동기장치자전거)를 혈중알코올농도 0.09% 상태에서 음주운전하다 단속되었습니다. 지방경찰청장은 병이 보유하고 있던 제2종 원동기면허뿐만 아니라, 오토바이 운전과 무관한 제1종 대형면허 및 제1종 보통면허까지 전부 취소하는 처분을 내렸습니다.",
    plaintiff: {
      name: "운전기사 병 (원고)",
      argument: "100cc 오토바이 음주운전을 이유로 생계수단인 1종 대형 및 보통면허까지 취소한 것은 실질적 관련성이 없는 제재를 결부시킨 '부당결부금지의 원칙' 및 비례원칙 위반입니다!"
    },
    defendant: {
      name: "지방경찰청장 (피고)",
      argument: "도로교통의 안전과 음주운전 근절이라는 중대한 공익 목적을 달성하기 위해 동일한 사람이 보유한 모든 복수 운전면허를 취소한 것은 적법합니다."
    },
    coreIssue: "원동기장치자전거 음주운전 사유로 제1종 대형/보통 운전면허까지 취소할 수 있는가? (부당결부금지 및 비례의 원칙)",
    correctPrinciple: "부당결부금지의 원칙",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "제1종 대형·보통면허 취소처분을 취소한다 (일부 인용)",
        desc: "오토바이 음주운전과 대형/보통면허 사이에는 실질적 관련성이 없으므로 이를 전부 취소한 처분은 위법하다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "한 사람의 음주운전 습벽은 모든 차종에 위험을 초래하므로 경찰청장의 전면 면허취소는 공익상 정당하다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다",
        desc: "음주운전 면허취소는 기속행위이므로 사법심사의 대상이 되지 않는다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 2012. 5. 24. 선고 2011두29571 판결 등",
      summary: "“한 사람이 여러 종류의 자동차 운전면허를 취득한 경우, 원동기장치자전거를 음주운전한 것을 이유로 제1종 대형면허나 보통면허까지 취소하는 것은 아무런 관련이 없는 면허까지 취소한 것으로서 위법하다.”",
      explanation: "행정권의 행사는 그와 실질적 관련이 없는 반대급부나 불이익을 결부시켜서는 안 된다는 '부당결부금지의 원칙' 및 '비례의 원칙'이 적용되는 대표적인 리딩 케이스입니다."
    }
  },
  {
    id: 4,
    type: "취소소송 (원고적격)",
    caseNo: "2024구합4410호",
    title: "시외버스운송사업 노선연장 인가처분 취소청구의 소",
    facts: "도지사는 B운수회사에게 기존 고속버스 노선의 연장을 인가해주었습니다. 이에 따라 같은 구간에서 수십 년간 노선버스를 운행해오던 기존 시외버스업자 A는 노선 중복으로 인해 막대한 영업 손실이 발생한다며 도지사의 인가처분 취소를 구하는 소송을 냈습니다.",
    plaintiff: {
      name: "기존 운송사업자 A (원고)",
      argument: "여객자동차 운송사업은 특허사업으로 기존업자의 경영상 이익을 법률상 보호하고 있습니다. 과당경쟁을 유발하는 위법한 인가처분에 대해 취소를 구할 원고적격이 있습니다!"
    },
    defendant: {
      name: "도지사 (피고)",
      argument: "A회사의 영업상 이익 감소는 자유시장 경쟁에 따른 사실상·경제상 반사적 이익 침해에 불과하므로 소송을 제기할 법률상 이익이 없습니다. 각하되어야 합니다."
    },
    coreIssue: "기존 특허업자가 제3자에 대한 신규 인가처분의 취소를 구할 '원고적격(행정소송법 제12조 법률상 이익)'이 인정되는가? (경업자 소송)",
    correctPrinciple: "원고적격 (법률상 이익)",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "원고적격을 인정하고, 위법한 노선연장 인가를 취소한다",
        desc: "특허사업인 노선운송사업에서 기존업자의 이익은 법률상 보호되는 이익(경업자 소송)이므로 원고적격이 있으며, 재량권 남용 인가는 취소되어야 한다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다 (원고적격 흠결)",
        desc: "경쟁업체의 진입으로 인한 매출 감소는 단순한 사실상·반사적 불이익에 불과하여 행정소송법상 법률상 이익이 없다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "원고적격은 있으나 도지사의 신규 인가는 주민 교통편의를 위한 것으로 적법하다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 2004. 4. 27. 선고 2003두10738 판결 [노선연장인가처분취소]",
      summary: "“자동차운송사업면허는 특정인에게 권리를 설정하는 특허처분이므로, 기존업자가 갖는 경영상 이익은 단순한 반사적 이익이 아니라 법률상 보호되는 이익이다. 따라서 기존업자는 제3자에 대한 인가처분의 취소를 구할 원고적격을 가진다.”",
      explanation: "허가(자유의 회복)와 달리 '특허(권리설정)' 사업에서는 기존업자의 이익이 법률상 보호되는 이익으로 인정되어 경업자에게 원고적격이 인정됩니다."
    }
  },
  {
    id: 5,
    type: "무효확인소송 (행정행위의 하자)",
    caseNo: "2024구합5102호",
    title: "종합소득세 부과처분 무효확인의 소",
    facts: "세무서장은 정에게 종합소득세 5천만 원을 부과·고지하면서, 납세고지서에 세액의 산출근거(과세표준, 세율, 공제액 등)를 전혀 기재하지 않은 채 총 납부세액만 달랑 적어 발송했습니다. 정은 세액산출근거 미기재는 중대·명백한 절차상 하자라며 무효확인 소송을 제기했습니다.",
    plaintiff: {
      name: "납세자 정 (원고)",
      argument: "산출근거가 전혀 없는 고지서는 납세자의 방어권을 근본적으로 침해한 것으로서 그 하자가 중대하고 명백하여 당연무효입니다!"
    },
    defendant: {
      name: "세무서장 (피고)",
      argument: "과세처분 자체는 실체적 세법에 따라 계산된 정당한 세액입니다. 절차상의 사소한 기재 누락은 취소사유에 불과할 뿐 당연무효는 아닙니다."
    },
    coreIssue: "납세고지서에 세액산출근거를 전혀 기재하지 아니한 하자가 행정처분의 '당연무효' 사유에 해당하는가?",
    correctPrinciple: "행정행위의 하자 (취소 vs 무효)",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "과세처분이 당연무효임을 확인한다 (인용)",
        desc: "세액산출근거 미기재는 납세자의 불복청구 기회를 박탈하는 절차상 중대하고도 객관적으로 명백한 하자로서 무효이다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "실제 과세대상 소득이 존재하고 세액이 타당하다면 기재 누락만으로 무효라고 볼 수 없다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다",
        desc: "취소소송의 제소기간이 지났으므로 무효확인 소송으로 우회 청구하는 것은 부적법하다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 1997. 5. 9. 선고 97누183 판결 [종합소득세부과처분취소 등]",
      summary: "“납세고지서에 과세표준과 세액의 산출근거 등이 전혀 기재되지 아니한 하자는 절차의 헌법적 적법절차를 위반한 것으로서 하자가 중대하고 명백하여 원칙적으로 당연무효이다.”",
      explanation: "행정절차의 하자가 내용상·외형상 명백하여 일반인의 관점에서도 무효로 볼 수 있는지(중대명백설)를 확인하는 핵심 판례입니다."
    }
  },
  {
    id: 6,
    type: "취소소송 (실효성 확보수단)",
    caseNo: "2024구합6218호",
    title: "건물퇴거 대집행계고처분 취소청구의 소",
    facts: "시장은 공공용지 협의매수 후에도 해당 토지 위의 건물에서 퇴거하지 않고 무단 점유하고 있는 무에게 '기한 내 퇴거하지 않으면 행정대집행을 통해 강제퇴거시키겠다'는 대집행 계고처분을 발령했습니다.",
    plaintiff: {
      name: "점유자 무 (원고)",
      argument: "사람을 건물 밖으로 내보내는 '퇴거 및 명도의무'는 타인이 대신할 수 없는 비대체적 작위의무이므로 행정대집행의 대상이 될 수 없습니다. 계고처분은 위법합니다!"
    },
    defendant: {
      name: "시장 (피고)",
      argument: "공공사업의 신속한 진행을 위해 불법점유자를 퇴거시키는 것은 필수적이며, 행정청의 자력집행 권능에 포함됩니다."
    },
    coreIssue: "건물 점유자의 '퇴거 및 명도의무'가 행정대집행법상 대집행의 대상(대체적 작위의무)이 될 수 있는가?",
    correctPrinciple: "행정대집행의 요건",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "원고의 청구를 인용한다 (대집행 계고처분을 취소한다)",
        desc: "퇴거 및 명도의무는 본인만이 이행할 수 있는 '비대체적 작위의무'이므로 행정대집행의 요건을 결여하여 위법하다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "공공용지의 원활한 확보를 위한 퇴거는 대집행을 통해 강제할 수 있는 적법한 행정강제이다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다",
        desc: "계고처분은 사실상의 사전통지에 불과하여 행정처분이 아니므로 각하한다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 1998. 10. 23. 선고 97누4398 판결 [대집행계고처분취소]",
      summary: "“건물의 점유자가 건물을 비우고 나가는 ‘퇴거의무’는 오직 그 사람만이 할 수 있는 ‘비대체적 작위의무’이므로 행정대집행법에 의한 대집행의 대상이 될 수 없다. 민사상 명도소송 등의 강제집행 절차에 의하여야 한다.”",
      explanation: "행정대집행은 오직 제3자가 대신 행할 수 있는 '대체적 작위의무(예: 불법건축물 철거의무)'의 불이행에 대해서만 허용됩니다."
    }
  },
  {
    id: 7,
    type: "국가배상청구소송 (손해전보)",
    caseNo: "2024가합7731호",
    title: "영조물 하자로 인한 국가배상청구의 소",
    facts: "원고 기는 야간에 고속도로를 정상 속도로 주행하던 중, 노면에 방치되어 있던 대형 낙하물(떨어진 화물 파편)을 들이받아 전복 사고를 당하고 중상을 입었습니다. 당시 한국도로공사(도로관리청)는 4시간 넘게 순찰을 돌지 않고 낙하물을 방치한 상태였습니다.",
    plaintiff: {
      name: "피해자 기 (원고)",
      argument: "도로 관리청이 4시간 동안 순찰과 낙하물 제거를 태만히 하여 통상 갖추어야 할 안전성을 결여했으므로 국가배상법 제5조에 따른 영조물 하자 손해배상 책임이 있습니다!"
    },
    defendant: {
      name: "대한민국 / 관리청 (피고)",
      argument: "낙하물은 제3자 화물차가 불법투하하고 도주한 것으로서 불가항력에 의한 사고이므로 관리청의 귀책사유가 없습니다."
    },
    coreIssue: "공공 영조물(고속도로)의 관리상 하자가 인정되는가? 제3자 투하물에 대한 불가항력 항변이 성립하는가?",
    correctPrinciple: "국가배상책임 (직무행위/영조물하자)",
    options: [
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "원고의 청구를 인용한다 (국가배상책임 인정)",
        desc: "고속도로에 위험한 낙하물이 장시간 방치되어 통상 갖추어야 할 안전성을 결여하였으므로 관리청의 영조물 하자가 인정된다."
      },
      {
        id: "deny",
        type: "deny",
        badge: "기각 판결",
        title: "원고의 청구를 기각한다",
        desc: "낙하물 사고는 전적으로 제3자의 불법행위로 인한 것이므로 관리청에 손해배상 책임을 물을 수 없다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다",
        desc: "국가배상심의회의 배상결정을 거치지 않고 제기된 소송이므로 부적법 각하한다."
      }
    ],
    correctOptionId: "grant",
    precedent: {
      name: "대법원 2004. 12. 9. 선고 2004다45129 판결 등",
      summary: "“고속도로와 같은 영조물은 통상 갖추어야 할 안전성을 결여한 하자가 인정되고, 관리청이 합리적인 순찰 주기를 위반하여 장시간 위험을 방치하였다면 객관적 안전성 결여로서 국가배상책임이 성립한다.”",
      explanation: "영조물의 하자는 과실책임이 아닌 '객관적 안전성 결여'를 기준으로 하는 무과실책임에 가깝습니다. 사전에 배상심의회를 거치는 것은 임의적 전치주의이므로 곧바로 법원에 소송을 제기할 수 있습니다."
    }
  },
  {
    id: 8,
    type: "취소소송 (사정판결)",
    caseNo: "2024구합8842호",
    title: "도시계획시설(도로공사) 실시계획인가 취소청구의 소",
    facts: "경은 관할 관청의 도시계획 도로개설 인가처분에 절차상 하자가 있다며 취소소송을 냈습니다. 재판 과정에서 처분의 위법성이 밝혀졌으나, 이미 300억 원의 국비가 투입되어 8차선 간선도로 공사가 95% 이상 완공되었고 개통을 앞두고 있습니다. 만약 인가를 취소하면 도로를 전부 철거해야 하여 도심 극심한 교통마비와 막대한 국가예산 낭비가 초래됩니다.",
    plaintiff: {
      name: "토지소유자 경 (원고)",
      argument: "인가처분에 명백한 법 위반 하자가 입증되었으므로 법치주의 원칙상 처분은 반드시 취소되어야 합니다!"
    },
    defendant: {
      name: "광역시장 (피고)",
      argument: "처분에 일부 흠결이 있더라도 이를 지금 취소하는 것은 극심한 교통대란과 막대한 재정손실 등 현저히 공공복리에 반하므로 '사정판결'로 기각해주십시오."
    },
    coreIssue: "처분이 위법하지만 취소하는 것이 '현저히 공공복리에 적합하지 아니한 경우' 행정소송법 제28조 사정판결을 내릴 수 있는가?",
    correctPrinciple: "비례의 원칙",
    options: [
      {
        id: "deny",
        type: "deny",
        badge: "사정판결 (기각)",
        title: "처분의 위법을 명시하되, 원고의 청구를 기각한다 (사정판결)",
        desc: "처분은 위법하나 취소 시 현저히 공공복리에 반하므로 기각하되, 주문에서 위법성을 선언하고 피고는 원고의 손해를 배상하여야 한다."
      },
      {
        id: "grant",
        type: "grant",
        badge: "인용 판결",
        title: "원고의 청구를 인용한다 (인가처분을 취소한다)",
        desc: "법치행정의 원칙상 위법한 처분은 어떠한 경우에도 용납될 수 없으므로 무조건 취소되어야 한다."
      },
      {
        id: "dismiss",
        type: "dismiss",
        badge: "각하 판결",
        title: "원고의 소를 각하한다",
        desc: "공사가 이미 95% 완료되었으므로 소송의 이익이 소멸하여 각하한다."
      }
    ],
    correctOptionId: "deny",
    precedent: {
      name: "대법원 1998. 5. 8. 선고 97누9757 판결 [행정소송법 제28조 사정판결]",
      summary: "“행정처분이 위법하더라도 이를 취소하는 것이 현저히 공공복리에 적합하지 아니하다고 인정하는 때에는 법원은 원고의 청구를 기각할 수 있다. 이 경우 법원은 판결 주문에서 그 처분이 위법함을 명시하여야 한다.”",
      explanation: "행정소송법 제28조에 규정된 '사정판결'은 원고의 청구가 이유 있으나 공공복리를 위해 예외적으로 기각하는 특별한 판결 형태입니다."
    }
  }
];

// 직급 체계 (점수 기반 승진)
const JUDGE_RANKS = [
  { minScore: 160, title: "대법관 (최고 법관)", desc: "대한민국 헌법과 법치의 정점에 오른 명판사입니다. 모든 행정법리와 판례를 완벽히 통달하였습니다." },
  { minScore: 130, title: "행정법원 수석부장판사", desc: "복잡한 공법상 분쟁을 능수능란하게 해결하는 행정재판의 최고 권위자입니다." },
  { minScore: 100, title: "행정법원 부장판사", desc: "국민의 권익구제와 행정 공익 간의 균형을 탁월하게 유지하는 법관입니다." },
  { minScore: 70,  title: "단독 판사 (3년차)", desc: "기본적인 행정법 원칙을 충실히 체득하며 착실히 재판을 이끌고 있습니다." },
  { minScore: 0,   title: "수습 배석판사 (1년차)", desc: "행정법 판례와 실무에 대해 아직 추가적인 연수와 학습이 필요합니다." }
];

// 3. 게임 상태 관리 (Game Controller)
class CourtGame {
  constructor() {
    this.sound = new SoundEngine();
    this.currentCaseIndex = 0;
    this.score = 100;
    this.selectedOptionId = null;
    this.caseResults = []; // 각 사건별 { caseNo, isCorrect, caseTitle }
    
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // 뷰 패널들
    this.startScreen = document.getElementById('start-screen');
    this.courtScreen = document.getElementById('court-screen');
    this.endScreen = document.getElementById('end-screen');
    this.verdictModal = document.getElementById('verdict-modal');

    // 상태 표시
    this.judgeRankEl = document.getElementById('judge-rank');
    this.reputationScoreEl = document.getElementById('reputation-score');
    this.caseProgressEl = document.getElementById('case-progress');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');

    // 사건 정보 요소
    this.docketTypeEl = document.getElementById('docket-type');
    this.docketNumberEl = document.getElementById('docket-number');
    this.docketTitleEl = document.getElementById('docket-title');
    this.caseFactsEl = document.getElementById('case-facts');
    this.plaintiffNameEl = document.getElementById('plaintiff-name');
    this.plaintiffArgEl = document.getElementById('plaintiff-arg');
    this.defendantNameEl = document.getElementById('defendant-name');
    this.defendantArgEl = document.getElementById('defendant-arg');
    this.caseCoreIssueEl = document.getElementById('case-core-issue');
    this.optionsContainer = document.getElementById('verdict-options');
    this.principleSelect = document.getElementById('law-principle-select');

    // 모달 요소
    this.modalStatusBanner = document.getElementById('modal-status-banner');
    this.modalIcon = document.getElementById('modal-icon');
    this.modalTitle = document.getElementById('modal-title');
    this.modalScoreFeedback = document.getElementById('modal-score-feedback');
    this.precedentCaseName = document.getElementById('precedent-case-name');
    this.precedentSummary = document.getElementById('precedent-summary');
    this.precedentExplanation = document.getElementById('precedent-explanation');

    // 버튼
    this.startBtn = document.getElementById('start-btn');
    this.submitVerdictBtn = document.getElementById('submit-verdict-btn');
    this.nextCaseBtn = document.getElementById('next-case-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // 엔딩 화면 요소
    this.finalScoreEl = document.getElementById('final-score');
    this.finalRankNameEl = document.getElementById('final-rank-name');
    this.finalRankDescEl = document.getElementById('final-rank-desc');
    this.statsSummaryEl = document.getElementById('stats-summary');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startGame());
    this.submitVerdictBtn.addEventListener('click', () => this.submitVerdict());
    this.nextCaseBtn.addEventListener('click', () => this.nextCase());
    this.restartBtn.addEventListener('click', () => this.restartGame());

    this.soundToggleBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      this.soundToggleBtn.textContent = this.sound.enabled ? '🔔 효과음 켜짐' : '🔕 효과음 꺼짐';
    });
  }

  startGame() {
    this.currentCaseIndex = 0;
    this.score = 100;
    this.caseResults = [];
    this.updateStatusHeader();
    
    this.startScreen.classList.remove('active');
    this.endScreen.classList.remove('active');
    this.courtScreen.classList.add('active');

    this.loadCase(this.currentCaseIndex);
    this.sound.init();
  }

  loadCase(index) {
    const caseData = CASES_DATABASE[index];
    this.selectedOptionId = null;
    this.principleSelect.value = "";

    this.caseProgressEl.textContent = `${index + 1} / ${CASES_DATABASE.length}`;
    this.docketTypeEl.textContent = caseData.type;
    this.docketNumberEl.textContent = caseData.caseNo;
    this.docketTitleEl.textContent = caseData.title;
    this.caseFactsEl.textContent = caseData.facts;
    this.plaintiffNameEl.textContent = caseData.plaintiff.name;
    this.plaintiffArgEl.textContent = caseData.plaintiff.argument;
    this.defendantNameEl.textContent = caseData.defendant.name;
    this.defendantArgEl.textContent = caseData.defendant.argument;
    this.caseCoreIssueEl.textContent = caseData.coreIssue;

    // 선택지 동적 렌더링
    this.optionsContainer.innerHTML = '';
    caseData.options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'verdict-option-card';
      card.dataset.id = opt.id;

      let badgeClass = 'badge-dismiss';
      if (opt.type === 'grant') badgeClass = 'badge-grant';
      if (opt.type === 'deny') badgeClass = 'badge-deny';

      card.innerHTML = `
        <span class="verdict-badge ${badgeClass}">${opt.badge}</span>
        <div class="verdict-option-title">${opt.title}</div>
        <div class="verdict-option-desc">${opt.desc}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.verdict-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedOptionId = opt.id;
      });

      this.optionsContainer.appendChild(card);
    });
  }

  submitVerdict() {
    if (!this.selectedOptionId) {
      alert("판결 주문(선택지)을 선택해주십시오!");
      return;
    }

    // 법봉 3타 소리 재생
    this.sound.playGavel();

    const currentCase = CASES_DATABASE[this.currentCaseIndex];
    const isVerdictCorrect = (this.selectedOptionId === currentCase.correctOptionId);
    const selectedPrinciple = this.principleSelect.value;
    const isPrincipleBonus = (selectedPrinciple === currentCase.correctPrinciple);

    let scoreDelta = 0;
    if (isVerdictCorrect) {
      scoreDelta += 15;
      if (isPrincipleBonus) {
        scoreDelta += 5; // 보너스 점수
      }
    } else {
      scoreDelta -= 10;
    }

    this.score = Math.max(0, this.score + scoreDelta);
    this.updateStatusHeader();

    this.caseResults.push({
      caseNo: currentCase.caseNo,
      title: currentCase.title,
      isCorrect: isVerdictCorrect
    });

    // 0.4초 뒤 모달 팝업 (법봉 소리와 호흡 맞춤)
    setTimeout(() => {
      this.showVerdictModal(isVerdictCorrect, scoreDelta, isPrincipleBonus, currentCase);
    }, 450);
  }

  showVerdictModal(isCorrect, scoreDelta, isPrincipleBonus, caseData) {
    if (isCorrect) {
      this.sound.playSuccess();
      this.modalStatusBanner.className = 'modal-header correct';
      this.modalIcon.textContent = '⚖️ 정당한 판결!';
      this.modalTitle.textContent = '대법원 판례 법리에 부합하는 타당한 판결입니다.';
      this.modalScoreFeedback.className = 'result-score-change plus';
      
      let bonusMsg = isPrincipleBonus ? " (적용 법리 일치 보너스 +5점 포함)" : "";
      this.modalScoreFeedback.textContent = `법치 평판 +${scoreDelta}점 획득!${bonusMsg}`;
    } else {
      this.sound.playError();
      this.modalStatusBanner.className = 'modal-header incorrect';
      this.modalIcon.textContent = '⚠️ 법리 오해 판결';
      this.modalTitle.textContent = '대법원의 확립된 판례 및 행정법리와 다릅니다.';
      this.modalScoreFeedback.className = 'result-score-change minus';
      this.modalScoreFeedback.textContent = `법치 평판 ${scoreDelta}점 감점 (상급심 파기환송)`;
    }

    this.precedentCaseName.textContent = caseData.precedent.name;
    this.precedentSummary.textContent = caseData.precedent.summary;
    this.precedentExplanation.textContent = caseData.precedent.explanation;

    this.verdictModal.classList.add('active');
  }

  nextCase() {
    this.verdictModal.classList.remove('active');
    this.currentCaseIndex++;

    if (this.currentCaseIndex < CASES_DATABASE.length) {
      this.loadCase(this.currentCaseIndex);
    } else {
      this.showEnding();
    }
  }

  showEnding() {
    this.courtScreen.classList.remove('active');
    this.endScreen.classList.add('active');

    this.finalScoreEl.textContent = `${this.score}점`;

    // 랭크 계산
    const rank = JUDGE_RANKS.find(r => this.score >= r.minScore) || JUDGE_RANKS[JUDGE_RANKS.length - 1];
    this.finalRankNameEl.textContent = rank.title;
    this.finalRankDescEl.textContent = rank.desc;

    // 사건별 통계 렌더링
    this.statsSummaryEl.innerHTML = '';
    this.caseResults.forEach((res, i) => {
      const item = document.createElement('div');
      item.className = `stat-item ${res.isCorrect ? 'ok' : 'fail'}`;
      item.innerHTML = `
        <strong>사건 ${i + 1}</strong><br>
        <span>${res.isCorrect ? '정타(적법)' : '오판(위법)'}</span>
      `;
      this.statsSummaryEl.appendChild(item);
    });

    this.sound.playSuccess();
  }

  restartGame() {
    this.startGame();
  }

  updateStatusHeader() {
    this.reputationScoreEl.textContent = `${this.score}점`;
    const rank = JUDGE_RANKS.find(r => this.score >= r.minScore) || JUDGE_RANKS[JUDGE_RANKS.length - 1];
    this.judgeRankEl.textContent = rank.title;
  }
}

// 브라우저 로드시 게임 인스턴스 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.game = new CourtGame();
});
