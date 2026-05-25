using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure SQLite DbContext
builder.Services.AddDbContext<DocketDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=../docket.db"));

// Register Services
builder.Services.AddHttpClient<IPythonAIServiceClient, PythonAIServiceClient>();
builder.Services.AddScoped<IComparisonEngine, ComparisonEngine>();
builder.Services.AddScoped<IStoreRecommendationEngine, StoreRecommendationEngine>();

// Configure CORS for Vite React Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Enable CORS
app.UseCors("AllowFrontend");

// Initialize and Seed Database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<DocketDbContext>();
        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred seeding the database.");
    }
}

app.UseAuthorization();
app.MapControllers();

// Configure to run on a predictable port (e.g. 5100)
app.Run("http://127.0.0.1:5100");
