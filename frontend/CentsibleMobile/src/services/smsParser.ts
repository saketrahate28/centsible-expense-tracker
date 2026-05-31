/**
 * Centsible SMS Parser — Comprehensive Indian Bank Edition
 *
 * Covers 30+ Indian banks & payment methods.
 * All parsing happens on-device for 100% privacy.
 */

// ─── Exported interface ─────────────────────────────────────────────────────
export interface ParsedTransaction {
    amount: number;
    merchant: string;
    accountReference: string;
    date: Date;
    rawSms: string;
    paymentMethod: string;
    category: string;
    isP2P: boolean; // true if payment was to a person (needs user review)
}

// ─── Bank sender-ID headers → Display Name ──────────────────────────────────
export const BANK_HEADERS: Record<string, string> = {
    // HDFC
    'HDFCBK': 'HDFC Bank',
    'HDFCBN': 'HDFC Bank',
    // ICICI
    'ICICIB': 'ICICI Bank',
    'ICICI':  'ICICI Bank',
    // SBI
    'SBIGPS': 'SBI',
    'SBINBY': 'SBI',
    'SBIUPI': 'SBI',
    'SBMSMS': 'SBI',
    // Axis
    'AXISBK': 'Axis Bank',
    'AXISBN': 'Axis Bank',
    // Kotak
    'KOTAKB': 'Kotak Bank',
    'KMBLSM': 'Kotak Bank',
    // Canara
    'CANBNK': 'Canara Bank',
    'CANBK':  'Canara Bank',
    'CNRBNK': 'Canara Bank',
    // PNB
    'PNBSMS': 'PNB',
    'PNBMOB': 'PNB',
    // Bank of Baroda
    'BOBTXN': 'Bank of Baroda',
    'BOBIBD': 'Bank of Baroda',
    // Union Bank
    'UTIBNK': 'Union Bank',
    'UBISMS': 'Union Bank',
    // Yes Bank
    'YESBK':  'Yes Bank',
    'YESBNK': 'Yes Bank',
    // IndusInd
    'INDBNK': 'IndusInd Bank',
    'IIBLTD': 'IndusInd Bank',
    // Federal Bank
    'FEDBK':  'Federal Bank',
    'FEDRAL': 'Federal Bank',
    // IDFC First
    'IDFCBK': 'IDFC First Bank',
    'IDFCFS': 'IDFC First Bank',
    // IDBI
    'IDBIBS': 'IDBI Bank',
    'IDBISM': 'IDBI Bank',
    // Indian Bank
    'IOBSMS': 'Indian Bank',
    'INDIAN': 'Indian Bank',
    // RBL
    'RMSGVB': 'RBL Bank',
    'RBLBNK': 'RBL Bank',
    // Bank of India
    'BOISOM': 'Bank of India',
    'BOIMOB': 'Bank of India',
    // Central Bank
    'CBISMS': 'Central Bank of India',
    // UCO Bank
    'UCOSMS': 'UCO Bank',
    // Karnataka Bank
    'KRNSMS': 'Karnataka Bank',
    // South Indian Bank
    'SIBSMS': 'South Indian Bank',
    // Bandhan Bank
    'BNDBNK': 'Bandhan Bank',
    // Paytm Payments Bank
    'PAYTMB': 'Paytm Payments Bank',
    // Airtel Payments Bank
    'AIRBNK': 'Airtel Payments Bank',
    // UPI generic
    'UPISMS': 'UPI',
    'NPCISM': 'UPI',
};

// ─── Category keyword lists ──────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
    {
        category: 'Transport',
        keywords: [
            // Metro systems
            'METRO', 'DMRC', 'NMMC', 'BMRCL', 'CMRL', 'MMRDA', 'HMRL', 'NCMC',
            // Bus services
            'BMTC', 'KSRTC', 'MSRTC', 'APSRTC', 'TSRTC', 'GSRTC', 'UPSRTC',
            'PMPML', 'DTC BUS', 'BEST BUS', 'CSTC',
            // Cabs & bikes
            'UBER', 'OLA', 'RAPIDO', 'MERU', 'SAVAARI', 'ZOOM CAR', 'DRIVEZY',
            'BLUEBELL', 'BOUNCE', 'YULU',
            // Rail
            'IRCTC', 'INDIAN RAIL', 'RAILWAY',
            // Air
            'INDIGO', 'SPICEJET', 'AIR INDIA', 'AIRINDIA', 'GOAIR', 'VISTARA',
            'AKASA', 'ALLIANCE AIR',
            // Ticketing
            'REDBUS', 'ABHIBUS', 'IXIGO', 'MAKEMYTRIP FLIGHT', 'GOIBIBO',
            // Parking / Fuel
            'PARKING', 'FASTAG', 'FUEL', 'PETROL', 'HP PETROL', 'BHARAT PETROL',
            'INDIAN OIL', 'IOCL',
        ],
    },
    {
        category: 'Entertainment',
        keywords: [
            'BOOKMYSHOW', 'BMS',
            'PVR', 'INOX', 'CINEPOLIS', 'MIRAJ CINEMA', 'CARNIVAL CINEMA',
            'NETFLIX', 'AMAZON PRIME', 'HOTSTAR', 'DISNEY+', 'JIOCINEMA',
            'SONYLIV', 'MXPLAYER', 'ZEE5', 'ALT BALAJI', 'EROSNOW',
            'SPOTIFY', 'GAANA', 'JIOSAAVN', 'WYNK', 'HUNGAMA', 'RESSO',
            'YOUTUBE PREMIUM', 'APPLE MUSIC', 'APPLE TV',
            'STEAM', 'EPIC GAMES', 'PLAYSTATION', 'XBOX',
        ],
    },
    {
        category: 'Food & Drinks',
        keywords: [
            // Delivery
            'ZOMATO', 'SWIGGY', 'EATFIT', 'DUNZO FOOD', 'DINEOUT',
            // Chains
            'STARBUCKS', 'CAFE COFFEE DAY', 'CCD', 'BARISTA',
            'MCDONALD', 'MCDONALDS', 'KFC', 'BURGER KING', 'SUBWAY',
            'DOMINOS', 'PIZZA HUT', 'PAPA JOHNS',
            'BARBEQUE NATION', 'HALDIRAM', 'BIKANER', 'MTR',
            'ROLLS MANIA', 'FAASOS', 'BOX8', 'FRESHMENU',
            // Generic
            'RESTAURANT', 'FOOD', 'DINING', 'BIRYANI', 'DHABA', 'HOTEL',
            'BAKERY', 'JUICE', 'ICE CREAM', 'AMUL', 'BASKIN',
        ],
    },
    {
        category: 'Groceries',
        keywords: [
            'BIGBASKET', 'GROFERS', 'BLINKIT', 'ZEPTO', 'DUNZO GROCERY',
            'DMART', 'MORE RETAIL', 'RELIANCE FRESH', 'RELIANCE SMART',
            'STAR BAZAAR', 'SPENCERS', 'SPAR', 'EASYDAY',
            'NILGIRIS', 'HERITAGE FOODS', 'LULU HYPERMARKET',
        ],
    },
    {
        category: 'Shopping',
        keywords: [
            // E-commerce
            'AMAZON', 'FLIPKART', 'MYNTRA', 'AJIO', 'MEESHO', 'NYKAA',
            'SNAPDEAL', 'SHOPCLUES', 'TATACLIQ', 'JIOMART',
            // Electronics
            'RELIANCE DIGITAL', 'CROMA', 'VIJAY SALES', 'POORVIKA',
            // Fashion & lifestyle
            'H&M', 'ZARA', 'LIFESTYLE', 'MAX FASHION', 'PANTALOONS',
            'WESTSIDE', 'FABINDIA', 'W FOR WOMAN',
            // Other retail
            'DECATHLON', 'FIRSTCRY', 'BABYSHOP',
        ],
    },
    {
        category: 'Bills & Utilities',
        keywords: [
            // Electricity
            'ELECTRICITY', 'BESCOM', 'MSEDCL', 'TNEB', 'BSES', 'TPDDL',
            'TATA POWER', 'ADANI ELECTRICITY', 'PSPCL', 'KESCO',
            // Telecom
            'AIRTEL', 'JIO', 'VODAFONE', 'BSNL', 'VI MOBILE', 'TATA TELE',
            // Internet & TV
            'BROADBAND', 'TATASKY', 'DISH TV', 'SUN DIRECT', 'HATHWAY',
            'ACT FIBERNET', 'TIKONA', 'SPECTRANET',
            // Gas & Water
            'ADANI GAS', 'MAHANAGAR GAS', 'INDRAPRASTHA GAS', 'PIPED GAS',
            'WATER BILL', 'MUNICIPAL',
            // Insurance
            'LIC', 'ICICI PRU', 'HDFC LIFE', 'MAX LIFE', 'BAJAJ ALLIANZ',
            'STAR HEALTH', 'CARE INSURANCE',
        ],
    },
    {
        category: 'Health',
        keywords: [
            'PHARMACY', 'MEDICAL STORE', 'CHEMIST',
            'APOLLO PHARMACY', 'MEDPLUS', 'NETMEDS', '1MG', 'PHARMEASY',
            'HEALTHKART', 'TATA 1MG',
            'HOSPITAL', 'CLINIC', 'DOCTOR', 'DIAGNOSTIC', 'LAB',
            'FORTIS', 'MAX HOSPITAL', 'MANIPAL', 'COLUMBIA ASIA',
        ],
    },
    {
        category: 'Education',
        keywords: [
            'BYJUS', 'UNACADEMY', 'VEDANTU', 'UPGRAD', 'COURSERA',
            'UDEMY', 'SKILLSHARE', 'WHITEHAT', 'TOPPR',
            'SCHOOL FEE', 'COLLEGE FEE', 'TUITION', 'COACHING',
            'BOOKS', 'STATIONERY',
        ],
    },
    {
        category: 'Investment & Finance',
        keywords: [
            'ZERODHA', 'GROWW', 'UPSTOX', 'ANGEL BROKING', 'MOTILAL',
            'COIN', 'PAYTM MONEY', 'KUVERA', 'ETMONEY',
            'MUTUAL FUND', 'SIP', 'LOAN EMI', 'HOME LOAN', 'CAR LOAN',
            'INSURANCE PREMIUM', 'CREDIT CARD BILL',
        ],
    },
];

// ─── Individual bank patterns — specific → universal ─────────────────────────
interface BankPattern {
    name: string;
    regex: RegExp;
    map: (m: RegExpMatchArray) => {
        amount: number;
        merchant: string;
        accountReference: string;
        date: Date;
        paymentMethod: string;
    };
}

const BANK_PATTERNS: BankPattern[] = [

    // ── HDFC – "Spent Rs.500 on HDFC Bank Card ending 1234 at AMAZON on 15-Mar-26"
    {
        name: 'HDFC_Spent',
        regex: /(?:Spent|Alert:)\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+on\s+HDFC\s+\w+\s+(?:Card|A\/c|acct)\s+ending\s*(\w+)\s+at\s+(.+?)(?:\s+on\s+\d|\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'HDFC Bank' }),
    },
    // ── HDFC – "Rs.1200 debited from A/c XX1234 on ... Info: SWIGGY"
    {
        name: 'HDFC_Debit',
        regex: /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+debited\s+from\s+(?:A\/c|Acct\.?|Account)\s*(?:XX)?(\w+).*?Info:\s*(.+?)(?:\.|Avl\b|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'HDFC Bank' }),
    },

    // ── ICICI – "ICICI Bank Acct XX1234 debited INR 500 on ... Info: Amazon"
    {
        name: 'ICICI_Debit',
        regex: /ICICI\s+Bank\s+Acct\s*(?:XX)?(\w+).*?(?:debited|spent)\s+(?:INR|Rs\.?)\s*([\d,]+(?:\.\d+)?).*?(?:Info:|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[2]), accountReference: last4(m[1]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'ICICI Bank' }),
    },
    // ── ICICI – "INR 500.00 spent on ICICI Card ending 1234. Info: ZOMATO"
    {
        name: 'ICICI_Spent',
        regex: /(?:INR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s+spent.*?(?:Card|A\/c)\s+ending\s*(\w+).*?Info:\s*(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'ICICI Bank' }),
    },

    // ── SBI – "Your A/c **1234 debited by Rs.500 on ... SWIGGY"
    {
        name: 'SBI_Debited',
        regex: /Your\s+A\/c\s+(?:\*+)?(\w+)\s+debited\s+by\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:to|at|for|towards)\s+(.+?)(?:\.|Avl\b|$)/i,
        map: (m) => ({ amount: num(m[2]), accountReference: last4(m[1]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'SBI' }),
    },
    // ── SBI – "Transaction of Rs. 250.00 done on SBI Card XXXXXX1234 at SWIGGY"
    {
        name: 'SBI_Card',
        regex: /Transaction\s+of\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:Card|A\/c)\s+(?:X+)?(\w+).*?at\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'SBI' }),
    },

    // ── Canara / Corp / Union – "Rs.198.40 paid thru A/C XX3730 on ... to ZOMATO, UPI Ref"
    {
        name: 'Canara_PaidThru',
        regex: /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+paid\s+(?:thru|through|via)\s+A\/[Cc]\s*(?:XX)?(\w+).*?to\s+(.+?)(?:,\s*UPI|\s+UPI|\s+Ref|\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Canara Bank' }),
    },

    // ── Axis – "Axis Bank: Rs. 500 debited from A/c ...1234 for AMAZON"
    {
        name: 'Axis_Debit',
        regex: /Axis\s+Bank.*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+debited.*?(?:A\/c|Card|ending)\s+(?:\.+)?(\w+).*?(?:for|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Axis Bank' }),
    },

    // ── Kotak – "Kotak Bank: Rs 500 debited from A/c 1234 at AMAZON"
    {
        name: 'Kotak_Debit',
        regex: /Kotak.*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+(?:debited|spent).*?(?:A\/c|Card|ending)\s+(?:\.+)?(\w+).*?(?:at|to|for)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Kotak Bank' }),
    },

    // ── PNB – "PNB: Acct XX1234 debited Rs 500 on ... Info: SWIGGY"
    {
        name: 'PNB_Debit',
        regex: /PNB.*?(?:Acct|A\/c)\s*(?:XX)?(\w+)\s+debited\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:Info:|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[2]), accountReference: last4(m[1]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'PNB' }),
    },

    // ── Bank of Baroda – "BOB: Rs.500 debited from A/c 1234 for ZOMATO"
    {
        name: 'BOB_Debit',
        regex: /(?:BOB|Bank of Baroda).*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:A\/c|Acct)\s*(?:XX)?(\w+).*?(?:for|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Bank of Baroda' }),
    },

    // ── Yes Bank – "YES BANK: Rs 500 debited ... A/c xx1234 ... at AMAZON"
    {
        name: 'YesBank_Debit',
        regex: /YES\s*BANK.*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:A\/c|Card)\s*(?:xx|XX)?(\w+).*?(?:at|to|for)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Yes Bank' }),
    },

    // ── IndusInd – "IndusInd Bank: Rs 500 debited from A/c 1234 at SWIGGY"
    {
        name: 'IndusInd_Debit',
        regex: /IndusInd.*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:A\/c|Card)\s*(?:XX)?(\w+).*?(?:at|to|for)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'IndusInd Bank' }),
    },

    // ── Federal Bank – "FedBank: Rs 500 debited from A/c xx1234. Info: ZOMATO"
    {
        name: 'Federal_Debit',
        regex: /(?:Federal\s+Bank|FedBank).*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:A\/c|Card)\s*(?:xx)?(\w+).*?(?:Info:|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'Federal Bank' }),
    },

    // ── IDFC First – "IDFC FIRST Bank: Rs 500 debited from A/c 1234. Info: AMAZON"
    {
        name: 'IDFC_Debit',
        regex: /IDFC.*?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:A\/c|Card)\s*(?:XX)?(\w+).*?(?:Info:|at|to)\s+(.+?)(?:\.|$)/i,
        map: (m) => ({ amount: num(m[1]), accountReference: last4(m[2]), merchant: clean(m[3]), date: new Date(), paymentMethod: 'IDFC First Bank' }),
    },

    // ── UPI Credit (PhonePe / GPay / Paytm) — "Rs 500 credited to VPA ..."
    // We skip credits — only track debits below

    // ── UPI generic debit — "debited ... A/c XX1234 ... to VPA zomato@axl"
    {
        name: 'UPI_VPA',
        regex: /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:debited|paid|sent).*?(?:A\/[Cc]|Acct)\s*(?:XX|x+)?(\w+).*?(?:to\s+VPA|to)\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+)/i,
        map: (m) => ({
            amount: num(m[1]),
            accountReference: last4(m[2]),
            merchant: m[3].split('@')[0].replace(/[-_.]/g, ' ').trim().toUpperCase(),
            date: new Date(),
            paymentMethod: 'UPI',
        }),
    },

    // ── Generic UPI "Money sent / paid to NAME for Rs X"
    {
        name: 'UPI_Sent',
        regex: /(?:Money\s+sent|You\s+paid)\s+(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)\s+to\s+(.+?)(?:\s+via|\s+using|\s+on\s+\d|$)/i,
        map: (m) => ({
            amount: num(m[1]),
            accountReference: '0000',
            merchant: clean(m[2]),
            date: new Date(),
            paymentMethod: 'UPI',
        }),
    },

    // ── PhonePe / GPay notification style — "Paid Rs.500 to MERCHANT via PhonePe"
    {
        name: 'PhonePe_GPay',
        regex: /(?:Paid|Sent)\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s+to\s+(.+?)\s+(?:via|using)\s+(?:PhonePe|Google\s*Pay|GPay|Paytm)/i,
        map: (m) => ({
            amount: num(m[1]),
            accountReference: '0000',
            merchant: clean(m[2]),
            date: new Date(),
            paymentMethod: 'UPI',
        }),
    },

    // ── Universal fallback — catches any "Rs X debited/paid ... A/c Y ... at/to Z"
    {
        name: 'Universal_Fallback',
        regex: /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?).*?(?:debited|paid|spent|deducted|charged).*?(?:A\/[Cc]|Card|Acct|account|ending)\s*(?:XX|X+|x+|\.+)?(\w+).*?(?:at|to|for|info:|merchant:)\s+(.+?)(?:\.|,\s*(?:Ref|UPI|IMPS|NEFT)|\s+(?:Ref|UPI|IMPS|NEFT)\b|$)/i,
        map: (m) => ({
            amount: num(m[1]),
            accountReference: last4(m[2]),
            merchant: clean(m[3]).replace(/VPA\s+/i, '').split('@')[0].trim().toUpperCase(),
            date: new Date(),
            paymentMethod: 'Bank Account',
        }),
    },
];

// ─── Utility functions ───────────────────────────────────────────────────────
const num = (s: string) => parseFloat(s.replace(/,/g, ''));
const last4 = (s: string) => s.slice(-4).toUpperCase();
const clean = (s: string) =>
    s.replace(/\s{2,}/g, ' ').replace(/['"]/g, '').trim().toUpperCase();

/** Returns true if the merchant string looks like a person's name or VPA */
const isP2P = (merchant: string): boolean => {
    // Has @ — it's a UPI VPA
    if (merchant.includes('@')) return false; // already cleaned to handle name@bank format
    // Common merchant-name indicators (has digits, is very long, is known brand keyword)
    if (/\d/.test(merchant)) return false;
    const words = merchant.trim().split(/\s+/);
    // ≤ 3 words, all alpha, no category keyword match → likely a person
    return (
        words.length >= 1 &&
        words.length <= 4 &&
        words.every((w) => /^[A-Z]+$/.test(w))
    );
};

/** Map merchant name → category string */
const categorize = (merchant: string): string => {
    const upper = merchant.toUpperCase();
    for (const { category, keywords } of CATEGORY_KEYWORDS) {
        if (keywords.some((k) => upper.includes(k.toUpperCase()))) {
            return category;
        }
    }
    return 'Uncategorized';
};

// ─── Main export ─────────────────────────────────────────────────────────────
export const parseSms = (smsBody: string, senderId?: string): ParsedTransaction | null => {
    // Detect bank from sender header
    let detectedBank = 'Unknown Bank';
    if (senderId) {
        const upper = senderId.toUpperCase();
        for (const [header, name] of Object.entries(BANK_HEADERS)) {
            if (upper.includes(header)) {
                detectedBank = name;
                break;
            }
        }
    }

    for (const pattern of BANK_PATTERNS) {
        let match: RegExpMatchArray | null = null;
        try {
            match = smsBody.match(pattern.regex);
        } catch {
            continue;
        }

        if (!match) continue;

        try {
            const result = pattern.map(match);

            // Sanity: amount must be a positive number
            if (!result.amount || isNaN(result.amount) || result.amount <= 0) continue;

            const merchant = result.merchant || 'Unknown';
            const category = categorize(merchant);
            const p2p = isP2P(merchant) || category === 'Uncategorized';

            const paymentMethod =
                result.paymentMethod === 'Bank Account' ? detectedBank : result.paymentMethod;

            return {
                ...result,
                merchant,
                category: p2p && category === 'Uncategorized' ? 'Needs Review' : category,
                paymentMethod,
                rawSms: smsBody,
                isP2P: p2p,
            };
        } catch {
            // Try next pattern
        }
    }

    return null;
};
