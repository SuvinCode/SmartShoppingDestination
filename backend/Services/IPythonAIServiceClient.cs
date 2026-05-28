using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend.Services
{
    public interface IPythonAIServiceClient
    {
        Task<OcrResult> ExtractReceiptItemsAsync(Stream fileStream, string filename);
        Task<MatchResult> MatchCatalogItemAsync(string query, List<CatalogItemCandidate> candidates);

        /// <summary>
        /// Sends all OCR item names to the Python service in a single HTTP request and
        /// receives all fuzzy-matched catalog results back at once, eliminating the N
        /// sequential round-trips that were causing the OCR scanning slowness.
        /// </summary>
        Task<List<BatchMatchResultItem>> BatchMatchCatalogItemsAsync(List<string> queries, List<CatalogItemCandidate> candidates);
    }
}
