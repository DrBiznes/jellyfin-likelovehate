using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.LikeLoveHate.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.LikeLoveHate;

/// <summary>
/// The LikeLoveHate plugin — lets users react to media with Like, Love, or Hate.
/// Uses File Transformation plugin if available, falls back to direct index.html injection.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string PluginName = "LikeLoveHate";

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Instance of the <see cref="IApplicationPaths"/> interface.</param>
    /// <param name="xmlSerializer">Instance of the <see cref="IXmlSerializer"/> interface.</param>
    /// <param name="logger">Instance of the <see cref="ILogger{Plugin}"/> interface.</param>
    /// <param name="configurationManager">Instance of the <see cref="IServerConfigurationManager"/> interface.</param>
    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger,
        IServerConfigurationManager configurationManager)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;

        try
        {
            logger.LogInformation("{PluginName} plugin is initializing...", PluginName);

            if (Configuration.InjectClientScript)
            {
                if (!TryRegisterFileTransformation(configurationManager, logger))
                {
                    logger.LogInformation("{PluginName}: File Transformation plugin not available, using direct injection", PluginName);
                    InjectScriptDirectly(applicationPaths, configurationManager, logger);
                }
            }

            logger.LogInformation("{PluginName} plugin initialization completed.", PluginName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{PluginName}: Error during plugin initialization", PluginName);
        }
    }

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override string Name => PluginName;

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("a7b3c1d2-4e5f-6789-abcd-ef0123456789");

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = string.Format(CultureInfo.InvariantCulture, "{0}.Configuration.configPage.html", GetType().Namespace),
            },
        ];
    }

    /// <summary>
    /// Attempts to register transformation with File Transformation plugin via reflection.
    /// </summary>
    private bool TryRegisterFileTransformation(IServerConfigurationManager configurationManager, ILogger<Plugin> logger)
    {
        try
        {
            Assembly? ftAssembly = AssemblyLoadContext.All
                .SelectMany(x => x.Assemblies)
                .FirstOrDefault(x => x.FullName?.Contains("FileTransformation", StringComparison.OrdinalIgnoreCase) ?? false);

            if (ftAssembly == null)
            {
                logger.LogDebug("{PluginName}: File Transformation assembly not found", PluginName);
                return false;
            }

            Type? pluginInterfaceType = ftAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            if (pluginInterfaceType == null)
            {
                logger.LogWarning("{PluginName}: PluginInterface type not found in File Transformation assembly", PluginName);
                return false;
            }

            MethodInfo? registerMethod = pluginInterfaceType.GetMethod("RegisterTransformation");
            if (registerMethod == null)
            {
                logger.LogWarning("{PluginName}: RegisterTransformation method not found", PluginName);
                return false;
            }

            var basePath = GetBasePath(configurationManager, logger);
            var version = GetType().Assembly.GetName().Version?.ToString() ?? "0.0.0.0";

            Func<object, string> transformCallback = (payload) =>
                TransformHtml(payload, basePath, version, logger);

            registerMethod.Invoke(null, new object[] { "index.html", transformCallback });

            logger.LogInformation("{PluginName}: Registered with File Transformation plugin", PluginName);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{PluginName}: Failed to register with File Transformation plugin", PluginName);
            return false;
        }
    }

    /// <summary>
    /// Transformation callback for File Transformation plugin.
    /// </summary>
    private string TransformHtml(object payload, string basePath, string version, ILogger<Plugin> logger)
    {
        try
        {
            var contentsProperty = payload.GetType().GetProperty("Contents");
            if (contentsProperty == null)
            {
                return string.Empty;
            }

            var html = contentsProperty.GetValue(payload)?.ToString() ?? string.Empty;
            var scriptElement = BuildScriptTag(basePath, version);

            if (html.Contains(scriptElement, StringComparison.Ordinal))
            {
                return html;
            }

            // Remove old versions of our script tag
            html = Regex.Replace(html, @"<script plugin=""LikeLoveHate"".*?></script>", string.Empty);

            int bodyClose = html.LastIndexOf("</body>", StringComparison.Ordinal);
            if (bodyClose == -1)
            {
                return html;
            }

            html = html.Insert(bodyClose, scriptElement);
            logger.LogDebug("{PluginName}: Transformed index.html via File Transformation", PluginName);
            return html;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{PluginName}: Error during HTML transformation", PluginName);
            var contentsProperty = payload.GetType().GetProperty("Contents");
            return contentsProperty?.GetValue(payload)?.ToString() ?? string.Empty;
        }
    }

    /// <summary>
    /// Direct injection fallback — writes script tag to index.html on disk.
    /// </summary>
    private void InjectScriptDirectly(
        IApplicationPaths applicationPaths,
        IServerConfigurationManager configurationManager,
        ILogger<Plugin> logger)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(applicationPaths.WebPath))
            {
                logger.LogWarning("{PluginName}: WebPath is not available", PluginName);
                return;
            }

            var indexFile = Path.Combine(applicationPaths.WebPath, "index.html");
            if (!File.Exists(indexFile))
            {
                logger.LogWarning("{PluginName}: index.html not found at {Path}", PluginName, indexFile);
                return;
            }

            var basePath = GetBasePath(configurationManager, logger);
            var version = GetType().Assembly.GetName().Version?.ToString() ?? "0.0.0.0";
            var scriptElement = BuildScriptTag(basePath, version);

            string html = File.ReadAllText(indexFile);

            if (html.Contains(scriptElement, StringComparison.Ordinal))
            {
                logger.LogInformation("{PluginName}: Script already injected", PluginName);
                return;
            }

            // Remove old versions of our script tag
            html = Regex.Replace(html, @"<script plugin=""LikeLoveHate"".*?></script>", string.Empty);

            int bodyClose = html.LastIndexOf("</body>", StringComparison.Ordinal);
            if (bodyClose == -1)
            {
                logger.LogWarning("{PluginName}: Could not find </body> in index.html", PluginName);
                return;
            }

            html = html.Insert(bodyClose, scriptElement);
            File.WriteAllText(indexFile, html);
            logger.LogInformation("{PluginName}: Script injected into index.html directly", PluginName);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogError(ex, "{PluginName}: Permission denied writing to index.html", PluginName);
        }
        catch (IOException ex)
        {
            logger.LogError(ex, "{PluginName}: I/O error writing to index.html", PluginName);
        }
    }

    /// <summary>
    /// Builds the script element to inject.
    /// </summary>
    private static string BuildScriptTag(string basePath, string version)
    {
        return $"<script plugin=\"LikeLoveHate\" version=\"{version}\" src=\"{basePath}/LikeLoveHate/ClientScript\" defer></script>";
    }

    /// <summary>
    /// Gets the configured base URL path from network configuration.
    /// </summary>
    private static string GetBasePath(IServerConfigurationManager configurationManager, ILogger<Plugin> logger)
    {
        try
        {
            var networkConfig = configurationManager.GetConfiguration("network");
            var baseUrlProp = networkConfig.GetType().GetProperty("BaseUrl");
            var baseUrl = baseUrlProp?.GetValue(networkConfig)?.ToString()?.Trim('/');
            return string.IsNullOrEmpty(baseUrl) ? string.Empty : "/" + baseUrl;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{PluginName}: Unable to get base path, using default", PluginName);
            return string.Empty;
        }
    }
}
