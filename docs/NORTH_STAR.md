# North Star

Status: Current
Owner: Krish Raja
Last verified: 2026-10-18

> By the end of the 2026/27 season in May 2027, Full Time is how thousands of Premier League fans start the morning after a match: their club first, their AI Pundit's take, every fact checked. Enough of them pay that it covers its own running costs.

Set by Krish on 18 October 2026. It is not reached yet. It is what every session in this repository works toward.

## The number

**Listeners who come back within the same week**: 10,000 by 31 May 2027, on a front-loaded weekly ladder. Checkpoints: 16 Nov 2026: 55; 14 Dec 2026: 169; 11 Jan 2027: 408; 8 Feb 2027: 872; 5 Apr 2027: 3,222; 31 May 2027: 10,000.

```yaml north-star-metric
metric: "Listeners who come back within the same week"
unit: count
direction: up
target: 10000
deadline: 2027-05-31
ladder_shape: front-loaded
source: "Supabase FullTime: listens by user, read-only"
status: active
ladder:
  - [2026-10-26, 10]
  - [2026-11-02, 24]
  - [2026-11-09, 38]
  - [2026-11-16, 55]
  - [2026-11-23, 76]
  - [2026-11-30, 101]
  - [2026-12-07, 132]
  - [2026-12-14, 169]
  - [2026-12-21, 214]
  - [2026-12-28, 268]
  - [2027-01-04, 332]
  - [2027-01-11, 408]
  - [2027-01-18, 498]
  - [2027-01-25, 604]
  - [2027-02-01, 728]
  - [2027-02-08, 872]
  - [2027-02-15, 1041]
  - [2027-02-22, 1236]
  - [2027-03-01, 1462]
  - [2027-03-08, 1724]
  - [2027-03-15, 2025]
  - [2027-03-22, 2371]
  - [2027-03-29, 2767]
  - [2027-04-05, 3222]
  - [2027-04-12, 3741]
  - [2027-04-19, 4333]
  - [2027-04-26, 5006]
  - [2027-05-03, 5772]
  - [2027-05-10, 6642]
  - [2027-05-17, 7627]
  - [2027-05-24, 8741]
  - [2027-05-31, 10000]
```

Urgency (U1 to U5) is worked out every week from where the number stands against that week's target, by [the harness contract](https://github.com/krishanraja/ai-harness/blob/main/contract/north-star-metric.md). Set by Krish on 23 October 2026.

## How to use it

- Read it before any work, every session.
- Before you start, say which part of it the task moves. If the task moves nothing toward it, say so first and let Krish decide.
- Prefer the work that moves it furthest, and close each session by noting what moved.
- Only Krish changes this file. Record his ruling in the commit body as `Ruling (Krish, YYYY-MM-DD): ...`.
- When it is reached, say so and ask Krish for the next one.
