namespace Centsible.Application.Interfaces;

public interface ICategoryPredictionService
{
    /// <summary>
    /// Predicts the category ID based on the merchant name or transaction note.
    /// Returns 0 (Uncategorized) if no match is found.
    /// </summary>
    int PredictCategoryId(string? merchant, string? note);
}
