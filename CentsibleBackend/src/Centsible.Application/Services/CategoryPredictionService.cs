using Centsible.Application.Interfaces;
using System.Collections.Generic;
using System.Linq;

namespace Centsible.Application.Services;

public class CategoryPredictionService : ICategoryPredictionService
{
    // Category IDs match the seeded global categories:
    // 1: Transport | 2: Food & Drinks | 3: Shopping | 4: Groceries
    // 5: Entertainment | 6: Bills & Utilities | 7: Health | 8: Education | 9: Investment & Finance
    private readonly Dictionary<string, int> _keywordMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // Transport (ID: 1)
        { "Uber", 1 }, { "Ola", 1 }, { "Rapido", 1 }, { "Metro", 1 }, { "IRCTC", 1 },
        { "Redbus", 1 }, { "Petrol", 1 }, { "Shell", 1 }, { "HPCL", 1 }, { "BPCL", 1 },
        { "Indian Oil", 1 }, { "MakeMyTrip", 1 }, { "GoIbibo", 1 }, { "Oyo", 1 },
        { "IndiGo", 1 }, { "AirIndia", 1 }, { "Vistara", 1 }, { "AutoRickshaw", 1 },

        // Food & Drinks (ID: 2)
        { "Swiggy", 2 }, { "Zomato", 2 }, { "Starbucks", 2 }, { "McDonalds", 2 }, { "KFC", 2 },
        { "Dominos", 2 }, { "Pizza", 2 }, { "Burger", 2 }, { "Restaurant", 2 }, { "Cafe", 2 },
        { "Beer", 2 }, { "Wine", 2 }, { "EatClub", 2 }, { "FreshMenu", 2 }, { "Cafe Coffee Day", 2 },
        { "Barista", 2 }, { "Haldiram", 2 }, { "Barbeque Nation", 2 },

        // Shopping (ID: 3)
        { "Amazon", 3 }, { "Flipkart", 3 }, { "Myntra", 3 }, { "Ajio", 3 }, { "Zara", 3 },
        { "HM", 3 }, { "Shopping", 3 }, { "Fashion", 3 }, { "Nykaa", 3 }, { "Meesho", 3 },
        { "Snapdeal", 3 }, { "Shopify", 3 }, { "Lenskart", 3 }, { "Clovia", 3 },

        // Groceries (ID: 4)
        { "BigBasket", 4 }, { "Blinkit", 4 }, { "Zepto", 4 }, { "Instamart", 4 },
        { "Reliance Retail", 4 }, { "DMart", 4 }, { "Grocery", 4 }, { "Milk", 4 },
        { "Supermarket", 4 }, { "Ration", 4 }, { "Nature's Basket", 4 }, { "More", 4 },

        // Entertainment (ID: 5)
        { "Netflix", 5 }, { "Hotstar", 5 }, { "Prime Video", 5 }, { "Spotify", 5 },
        { "Movie", 5 }, { "PVR", 5 }, { "Inox", 5 }, { "Gaming", 5 }, { "Steam", 5 },
        { "BookMyShow", 5 }, { "YouTube Premium", 5 }, { "JioCinema", 5 }, { "SonyLIV", 5 },
        { "Apple Music", 5 }, { "Wynk", 5 }, { "Gaana", 5 },

        // Bills & Utilities (ID: 6)
        { "Airtel", 6 }, { "Jio", 6 }, { "Vi", 6 }, { "Vodafone", 6 }, { "BSNL", 6 },
        { "Electricity", 6 }, { "Water", 6 }, { "Rent", 6 }, { "Insurance", 6 },
        { "Recharge", 6 }, { "Broadband", 6 }, { "Gas", 6 }, { "LPG", 6 },
        { "Tata Power", 6 }, { "BESCOM", 6 }, { "MSEDCL", 6 }, { "DTH", 6 }, { "Tata Sky", 6 },

        // Health (ID: 7)
        { "Apollo", 7 }, { "Medplus", 7 }, { "PharmEasy", 7 }, { "Netmeds", 7 },
        { "Pharma", 7 }, { "Doctor", 7 }, { "Hospital", 7 }, { "Clinic", 7 },
        { "Medicine", 7 }, { "Gym", 7 }, { "Yoga", 7 }, { "Cult", 7 }, { "1mg", 7 },
        { "Lybrate", 7 }, { "Practo", 7 }, { "Dentist", 7 }, { "Pathology", 7 },

        // Education (ID: 8)
        { "Coursera", 8 }, { "Udemy", 8 }, { "Unacademy", 8 }, { "Byju", 8 }, { "Khan Academy", 8 },
        { "School", 8 }, { "College", 8 }, { "University", 8 }, { "Tuition", 8 }, { "Coaching", 8 },
        { "Book", 8 }, { "Stationery", 8 }, { "Study", 8 }, { "WhiteHat Jr", 8 },
        { "UpGrad", 8 }, { "Simplilearn", 8 }, { "GATE", 8 }, { "Vedantu", 8 },

        // Investment & Finance (ID: 9)
        { "Zerodha", 9 }, { "Groww", 9 }, { "Upstox", 9 }, { "Kuvera", 9 }, { "Paytm Money", 9 },
        { "Mutual Fund", 9 }, { "SIP", 9 }, { "Stock", 9 }, { "IPO", 9 }, { "LIC", 9 },
        { "HDFC Mutual", 9 }, { "SBI Mutual", 9 }, { "ICICI Pru", 9 }, { "Demat", 9 },
        { "NPS", 9 }, { "PPF", 9 }, { "FD", 9 }, { "Fixed Deposit", 9 },
    };

    // P2P transfers (UPI, bank transfers) — should NOT be miscategorized
    private static readonly HashSet<string> P2PIndicators = new(StringComparer.OrdinalIgnoreCase)
    {
        "@okaxis", "@okhdfcbank", "@oksbi", "@okicici", "@ybl", "@upi", "@paytm",
        "@ibl", "@axl", "@sbi", "@hdfc", "sent to", "paid to", "transfer to",
        "upi transfer", "neft", "rtgs", "imps"
    };

    public int PredictCategoryId(string? merchant, string? note)
    {
        var combined = $"{merchant} {note}".Trim();
        if (string.IsNullOrWhiteSpace(combined)) return 0;

        // Check if this looks like a P2P transfer — return 0 (Uncategorized)
        var combinedLower = combined.ToLower();
        if (P2PIndicators.Any(p => combinedLower.Contains(p)))
            return 0;

        // Keyword match (case-insensitive via dictionary comparer)
        foreach (var entry in _keywordMap)
        {
            if (combinedLower.Contains(entry.Key.ToLower()))
                return entry.Value;
        }

        return 0; // Default to Uncategorized
    }
}
