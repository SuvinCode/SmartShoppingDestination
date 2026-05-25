using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace backend.Services
{
    public class PythonAIServiceClient : IPythonAIServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _pythonServiceUrl;

        public PythonAIServiceClient(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _pythonServiceUrl = configuration["PythonService:BaseUrl"] ?? "http://127.0.0.1:8000";
        }

        public async Task<OcrResult> ExtractReceiptItemsAsync(Stream fileStream, string filename)
        {
            try
            {
                using var content = new MultipartFormDataContent();
                // Copy stream to memory to prevent disposed stream exceptions
                var memoryStream = new MemoryStream();
                await fileStream.CopyToAsync(memoryStream);
                memoryStream.Position = 0;
                
                var streamContent = new StreamContent(memoryStream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
                content.Add(streamContent, "file", filename);

                var response = await _httpClient.PostAsync($"{_pythonServiceUrl}/api/ocr", content);
                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Python AI Service Error: {err}");
                    return new OcrResult { StoreDetected = "Coles", Items = new List<OcrItem>(), RawText = "Error communicating with AI service." };
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                return await response.Content.ReadFromJsonAsync<OcrResult>(options) ?? new OcrResult();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception calling Python AI Service: {ex.Message}");
                return new OcrResult
                {
                    StoreDetected = "Coles",
                    Items = new List<OcrItem>(),
                    RawText = $"Failed to connect to Python AI: {ex.Message}"
                };
            }
        }

        public async Task<MatchResult> MatchCatalogItemAsync(string query, List<CatalogItemCandidate> candidates)
        {
            try
            {
                var request = new MatchRequest
                {
                    Query = query,
                    Candidates = candidates,
                    Limit = 3
                };

                var response = await _httpClient.PostAsJsonAsync($"{_pythonServiceUrl}/api/match", request);
                if (!response.IsSuccessStatusCode)
                {
                    return new MatchResult { Query = query, Matches = new List<FuzzyMatch>() };
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                return await response.Content.ReadFromJsonAsync<MatchResult>(options) ?? new MatchResult();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception calling Python AI Service Match: {ex.Message}");
                return new MatchResult { Query = query, Matches = new List<FuzzyMatch>() };
            }
        }
    }

    public class OcrResult
    {
        [System.Text.Json.Serialization.JsonPropertyName("store_detected")]
        public string StoreDetected { get; set; } = "";

        [System.Text.Json.Serialization.JsonPropertyName("store_location")]
        public string StoreLocation { get; set; } = "";

        [System.Text.Json.Serialization.JsonPropertyName("items")]
        public List<OcrItem> Items { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("receipt_total")]
        public decimal? ReceiptTotal { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("raw_text")]
        public string RawText { get; set; } = "";
    }

    public class OcrItem
    {
        [System.Text.Json.Serialization.JsonPropertyName("raw_name")]
        public string RawName { get; set; } = "";

        [System.Text.Json.Serialization.JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("total_price")]
        public decimal TotalPrice { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("unit_price")]
        public decimal UnitPrice { get; set; }
    }

    public class CatalogItemCandidate
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }

    public class MatchRequest
    {
        public string Query { get; set; } = "";
        public List<CatalogItemCandidate> Candidates { get; set; } = new();
        public int Limit { get; set; } = 5;
    }

    public class MatchResult
    {
        public string Query { get; set; } = "";
        public List<FuzzyMatch> Matches { get; set; } = new();
    }

    public class FuzzyMatch
    {
        public CatalogItemCandidate Candidate { get; set; } = new();
        public double Score { get; set; }
    }
}
