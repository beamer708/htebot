# HowToERLC Bot — Claude Instructions

## Announcement Formatting

When the user asks for a Discord announcement, always follow this format exactly. Output the announcement inside a single code block so it can be copied directly.

### Custom Emojis
Always use these exact emoji strings — never substitute with Unicode or different IDs:

| Name | String |
|------|--------|
| Logo | `<:howtoglogo:1494830728113033327>` |
| Check | `<:Check:1494830681484824616>` |
| Cancel | `<:Cancel:1494830662581092482>` |
| Dot | `<:Dot:1496643767585865818>` |
| On | `<:On:1498148402180001942>` |
| Off | `<:Off:1498148430634160248>` |
| RightArrow | `<:RightArrow:1498148469284667562>` |
| LeftArrow | `<:LeftArrow:1498148495683751947>` |
| Mention | `<:Mention:1494830498290340000>` |

### Structure

```
<:howtoglogo:1494830728113033327> **[Title]**

[Opening sentence — one or two lines, plain tone, no hype.]

<:RightArrow:1498148469284667562> **[Point 1 label]** [Detail]

<:RightArrow:1498148469284667562> **[Point 2 label]** [Detail]

<:Dot:1496643767585865818> [Closing note or call to action]

> <:On:1498148402180001942> **[Status line]**

-# ** <:Mention:1494830498290340000> [howtoerlc.xyz](https://howtoerlc.xyz)**
-# ** <:howtoglogo:1494830728113033327> Other servers sell this. We don't.**
@everyone
```

### Rules
- No em dashes (—) anywhere in the announcement
- Keep tone direct and confident, not overly promotional
- `<:RightArrow:>` for bullet points with bold labels
- `<:Dot:>` for a single closing note or reminder
- `> <:On:>` or `> <:Off:>` for a status line in a blockquote at the end
- Footer is always the two `-#` lines shown above
- Add `@everyone` or `@here` only if the user specifies a ping
- If no ping, add a note in parentheses below the footer like: `(No ping, will happen again with a ping)`

### Example Output

```
<:howtoglogo:1494830728113033327> **Open Production**

We are hosting an open production for recording TikTok content for HowToERLC.

<:RightArrow:1498148469284667562> **Anyone can join** and help us create content for the page.

<:RightArrow:1498148469284667562> **Early access** to announcements and polls in our new updates channel for everyone who helps out.

<:RightArrow:1498148469284667562> **Where?** In a private ERLC server — details on joining will be shared when we start.

<:RightArrow:1498148469284667562> **When?** Within the next hour.

<:Dot:1496643767585865818> Please react to this message if you plan on attending.

> <:On:1498148402180001942> **Production is now open.**

-# ** <:Mention:1494830498290340000> [howtoerlc.xyz](https://howtoerlc.xyz)**
-# ** <:howtoglogo:1494830728113033327> Other servers sell this. We don't.**
(No ping, will happen again with a ping)
```
