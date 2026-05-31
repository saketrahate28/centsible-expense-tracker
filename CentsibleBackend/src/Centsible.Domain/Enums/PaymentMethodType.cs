namespace Centsible.Domain.Enums;

public enum PaymentMethodType
{
    Cash = 0,
    GPay = 1,
    PhonePe = 2,
    Paytm = 3,
    BhimUpi = 4,
    CreditCard = 5,
    DebitCard = 6,
    BankTransfer = 7,   // NEFT / RTGS / IMPS
    Other = 99
}
