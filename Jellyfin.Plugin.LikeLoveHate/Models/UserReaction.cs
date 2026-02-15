using System;

namespace Jellyfin.Plugin.LikeLoveHate.Models;

/// <summary>
/// The type of reaction a user can give.
/// </summary>
public enum ReactionType
{
    /// <summary>
    /// No reaction (default).
    /// </summary>
    None = 0,

    /// <summary>
    /// Thumbs up — user likes the item.
    /// </summary>
    Like = 1,

    /// <summary>
    /// Double thumbs up — user loves the item.
    /// </summary>
    Love = 2,

    /// <summary>
    /// Thumbs down — user hates the item.
    /// </summary>
    Hate = 3,
}

/// <summary>
/// Represents a single user's reaction to a media item.
/// </summary>
public class UserReaction
{
    /// <summary>
    /// Gets or sets the media item ID.
    /// </summary>
    public Guid ItemId { get; set; }

    /// <summary>
    /// Gets or sets the user ID.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the reaction type.
    /// </summary>
    public ReactionType Reaction { get; set; }

    /// <summary>
    /// Gets or sets the timestamp of the reaction.
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Gets or sets the cached user name for display.
    /// </summary>
    public string? UserName { get; set; }
}
