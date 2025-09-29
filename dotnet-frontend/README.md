Linker Frontend (ASP.NET Core Razor Pages, .NET 9)

This is a minimal Razor Pages frontend intended to be used together with the Next.js backend in the repository root.

How to run
- Install .NET 9 SDK (preview if required) from https://dotnet.microsoft.com
- From this folder run:

```powershell
dotnet run --project .\LinkerFrontend.csproj
```

The app will start on http://localhost:5000 by default. Start the Next.js backend (root) on http://localhost:3000 and the frontend will call backend APIs (examples in the Index page).
