using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend.Services
{
    public interface IPythonAIServiceClient
    {
        Task<OcrResult> ExtractReceiptItemsAsync(Stream fileStream, string filename);
        Task<MatchResult> MatchCatalogItemAsync(string query, List<CatalogItemCandidate> candidates);
    }
}
