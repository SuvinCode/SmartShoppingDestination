using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Collections.Generic;

public class Program
{
    public static void Main()
    {
        string json = @"{""store_detected"":""Woolworths"",""store_location"":""South Yarra"",""items"":[{""raw_name"":""Woolworths Full Cream Milk 2L"",""quantity"":1,""total_price"":3.6,""unit_price"":3.6}],""receipt_total"":19.6,""raw_text"":""(Simulated Coles receipt)""}";
        
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<OcrResult>(json, options);
        Console.WriteLine($"Total: {result.ReceiptTotal}");
        Console.WriteLine($"Items: {result.Items?.Count}");
    }
}

public class OcrResult
{
    [JsonPropertyName("store_detected")]
    public string StoreDetected { get; set; } = "";

    [JsonPropertyName("store_location")]
    public string StoreLocation { get; set; } = "";

    [JsonPropertyName("items")]
    public List<OcrItem> Items { get; set; } = new List<OcrItem>();

    [JsonPropertyName("receipt_total")]
    public decimal? ReceiptTotal { get; set; }

    [JsonPropertyName("raw_text")]
    public string RawText { get; set; } = "";
}

public class OcrItem
{
    [JsonPropertyName("raw_name")]
    public string RawName { get; set; } = "";

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("total_price")]
    public decimal TotalPrice { get; set; }

    [JsonPropertyName("unit_price")]
    public decimal UnitPrice { get; set; }
}
