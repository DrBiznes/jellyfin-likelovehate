using System;
using System.Linq;
using System.Net.Mime;
using System.Text.Json;
using Jellyfin.Plugin.LikeLoveHate.Data;
using Jellyfin.Plugin.LikeLoveHate.Models;
using MediaBrowser.Common.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.LikeLoveHate.Api;

/// <summary>
/// API controller for user reactions (Like / Love / Hate).
/// </summary>
[ApiController]
[Route("api/LikeLoveHate")]
public class ReactionsController : ControllerBase
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    private readonly ReactionRepository _repository;
    private readonly ILogger<ReactionsController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReactionsController"/> class.
    /// </summary>
    /// <param name="appPaths">Application paths.</param>
    /// <param name="logger">Logger instance.</param>
    public ReactionsController(
        IApplicationPaths appPaths,
        ILogger<ReactionsController> logger)
    {
        _repository = new ReactionRepository(appPaths);
        _logger = logger;
    }

    /// <summary>
    /// Set a reaction on a media item.
    /// </summary>
    /// <param name="itemId">The item ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <param name="reaction">The reaction type (1=Like, 2=Love, 3=Hate).</param>
    /// <param name="userName">Optional user display name.</param>
    /// <returns>Success or error result.</returns>
    [HttpPost("React")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult ReactToItem(
        [FromQuery] Guid itemId,
        [FromQuery] Guid userId,
        [FromQuery] int reaction,
        [FromQuery] string? userName)
    {
        try
        {
            if (reaction < 1 || reaction > 3)
            {
                return BadRequest(new { success = false, message = "Reaction must be 1 (Like), 2 (Love), or 3 (Hate)" });
            }

            var userReaction = new UserReaction
            {
                ItemId = itemId,
                UserId = userId,
                Reaction = (ReactionType)reaction,
                Timestamp = DateTime.UtcNow,
                UserName = userName ?? "Unknown",
            };

            _repository.SaveReaction(userReaction);

            var reactionName = userReaction.Reaction switch
            {
                ReactionType.Like => "liked",
                ReactionType.Love => "loved",
                ReactionType.Hate => "disliked",
                _ => "reacted to",
            };

            _logger.LogInformation("User {UserName} ({UserId}) {Reaction} item {ItemId}", userReaction.UserName, userId, reactionName, itemId);

            return Ok(new { success = true, message = "Reaction saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving reaction");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Get all reactions and stats for a media item.
    /// </summary>
    /// <param name="itemId">The item ID.</param>
    /// <returns>Reactions list and aggregate stats.</returns>
    [HttpGet("Item/{itemId}")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult GetItemReactions(Guid itemId)
    {
        try
        {
            var reactions = _repository.GetReactionsForItem(itemId);
            var stats = _repository.GetStatsForItem(itemId);

            return Ok(new
            {
                success = true,
                reactions = reactions.Select(r => new
                {
                    userId = r.UserId,
                    userName = r.UserName,
                    reaction = (int)r.Reaction,
                    reactionName = r.Reaction.ToString(),
                    timestamp = r.Timestamp,
                }),
                likes = stats.Likes,
                loves = stats.Loves,
                hates = stats.Hates,
                total = stats.Total,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching reactions for item {ItemId}", itemId);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Get the current user's reaction for an item.
    /// </summary>
    /// <param name="itemId">The item ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>The user's reaction or null.</returns>
    [HttpGet("MyReaction/{itemId}")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult GetMyReaction(Guid itemId, [FromQuery] Guid userId)
    {
        try
        {
            var reaction = _repository.GetReaction(itemId, userId);

            if (reaction == null)
            {
                return Ok(new { success = true, reaction = (int?)null });
            }

            return Ok(new
            {
                success = true,
                reaction = (int)reaction.Reaction,
                reactionName = reaction.Reaction.ToString(),
                timestamp = reaction.Timestamp,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching reaction for user {UserId} on item {ItemId}", userId, itemId);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a user's reaction for an item.
    /// </summary>
    /// <param name="itemId">The item ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>Success or error result.</returns>
    [HttpDelete("Reaction")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult DeleteReaction([FromQuery] Guid itemId, [FromQuery] Guid userId)
    {
        try
        {
            _repository.DeleteReaction(itemId, userId);
            _logger.LogInformation("User {UserId} removed reaction on item {ItemId}", userId, itemId);
            return Ok(new { success = true, message = "Reaction deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting reaction");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Export all reactions as JSON.
    /// </summary>
    /// <returns>JSON file download.</returns>
    [HttpGet("Export")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult ExportReactions()
    {
        try
        {
            var reactions = _repository.GetAllReactions();
            var json = JsonSerializer.Serialize(reactions, _jsonOptions);
            return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", "reactions_export.json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting reactions");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
