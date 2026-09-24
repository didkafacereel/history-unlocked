<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /*
       * History Unlocked — daily TikTok short. 1080x1920, 50–60s, one story.
       *
       * THIS IS A TEMPLATE. index.html is generated from it by
       * tools/build-composition.mjs, which fills every {{…}} and the TIMINGS
       * object from the measured narration. Edit this file, never index.html.
       *
       * Brand from the app's own tokens (src/theme/tokens.ts): void, ink,
       * intel amber. Two voices in type: DM Serif Display for the archive
       * speaking (dates, statements), Anton for the feed speaking (captions,
       * labels) — old record, new format.
       *
       * TikTok safe zone: its UI covers the top ~150px, the bottom ~400px and a
       * ~130px column on the right, so nothing that must be read lives there.
       */
      @font-face {
        font-family: "Anton";
        src: url("fonts/anton-normal.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "DM Serif Display";
        src: url("fonts/dmserif-normal.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "DM Serif Display";
        src: url("fonts/dmserif-italic.woff2") format("woff2");
        font-weight: 400;
        font-style: italic;
      }

      :root {
        --void: #06070a;
        --ink: #0c0e14;
        --ink-raised: #141826;
        --gold: #f5b73b;
        --gold-soft: rgba(245, 183, 59, 0.22);
        --text: #f4f6fb;
        --text-2: rgba(244, 246, 251, 0.78);
        --crash: #ff5470;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        overflow: hidden;
        background: var(--void);
      }
      #root {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--void);
        color: var(--text);
      }

      .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      .layer {
        position: absolute;
        inset: 0;
      }
      .solid {
        background: var(--void);
      }
      .cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .shade {
        background:
          radial-gradient(ellipse 90% 60% at 50% 38%, rgba(6, 7, 10, 0.35), rgba(6, 7, 10, 0.86) 70%),
          rgba(6, 7, 10, 0.25);
      }
      .glow {
        background: radial-gradient(ellipse 70% 45% at 50% 40%, var(--gold-soft), transparent 70%);
      }
      .content {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        padding: 200px 150px 420px 72px;
        gap: 18px;
        box-sizing: border-box;
      }

      .kicker {
        font-family: "Anton", sans-serif;
        font-size: 46px;
        letter-spacing: 0.2em;
        color: var(--gold);
        text-transform: uppercase;
        line-height: 1.05;
      }
      .label {
        font-family: "Anton", sans-serif;
        font-size: 40px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text);
        line-height: 1.1;
      }
      .serif {
        font-family: "DM Serif Display", serif;
        font-weight: 400;
        text-wrap: balance;
      }
      .italic {
        font-family: "DM Serif Display", serif;
        font-style: italic;
        text-wrap: balance;
      }
      .rule {
        width: 100%;
        max-width: 560px;
        height: 4px;
        background: var(--gold);
      }
      .frame {
        position: relative;
        width: 100%;
        overflow: hidden;
        border: 3px solid var(--gold);
        background: var(--ink-raised);
      }
      .frame img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 22%;
        display: block;
      }

      /* ── 1. the date ─────────────────────────────────────────────── */
      #s1-date {
        font-family: "Anton", sans-serif;
        font-size: 66px;
        letter-spacing: 0.08em;
        color: var(--text);
        line-height: 1;
      }
      #s1-year {
        font-family: "DM Serif Display", serif;
        font-size: 330px;
        line-height: 0.86;
        letter-spacing: -0.03em;
        color: var(--gold);
      }
      #s1-where {
        font-size: 50px;
        color: var(--text-2);
        max-width: 760px;
        line-height: 1.15;
      }

      /* ── 2. the gold ring ────────────────────────────────────────── */
      .pair {
        display: flex;
        gap: 32px;
        width: 100%;
        max-width: 858px;
      }
      .card {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .card .frame {
        height: 520px;
      }
      .role {
        font-size: 36px;
        color: var(--gold);
        line-height: 1.15;
      }
      #s2-plan {
        display: flex;
        align-items: center;
        gap: 22px;
        margin-top: 10px;
      }
      #s2-up {
        width: 64px;
        height: 80px;
        flex: none;
      }
      #s2-where {
        font-size: 34px;
        letter-spacing: 0.12em;
        color: var(--text);
      }

      /* ── 3. the problem ──────────────────────────────────────────── */
      #s3-main {
        font-size: 104px;
        line-height: 1.03;
        letter-spacing: -0.02em;
        max-width: 858px;
      }
      #s3-cal {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 26px;
      }
      .cal-row {
        display: flex;
        gap: 9px;
      }
      .cal-cell {
        width: 52px;
        height: 52px;
        border: 2px solid rgba(244, 246, 251, 0.35);
        background: rgba(244, 246, 251, 0.06);
      }
      .cal-sell {
        font-family: "Anton", sans-serif;
        font-size: 30px;
        letter-spacing: 0.14em;
        color: var(--gold);
      }
      #s3-foot {
        font-size: 40px;
        color: var(--text-2);
        max-width: 820px;
        line-height: 1.2;
      }

      /* ── 4. the inside man ───────────────────────────────────────── */
      #s4-ghost {
        position: absolute;
        left: -40px;
        top: 250px;
        font-family: "Anton", sans-serif;
        font-size: 330px;
        line-height: 0.9;
        color: rgba(245, 183, 59, 0.12);
        white-space: nowrap;
      }
      #s4-way {
        font-size: 64px;
        color: var(--text-2);
        line-height: 1.1;
      }
      #s4-main {
        font-size: 124px;
        line-height: 1.02;
        letter-spacing: -0.02em;
        max-width: 858px;
        margin-top: 30px;
      }
      #s4-fact {
        font-size: 44px;
        line-height: 1.2;
        color: var(--text-2);
        max-width: 820px;
      }

      /* ── 5. the order ────────────────────────────────────────────── */
      #s5-text {
        justify-content: flex-end;
        padding-bottom: 900px;
      }
      #s5-when {
        font-size: 36px;
        letter-spacing: 0.16em;
        color: var(--gold);
      }
      #s5-line {
        font-size: 58px;
        color: var(--gold);
        line-height: 1.1;
        max-width: 820px;
      }

      /* ── 6. the crash ────────────────────────────────────────────── */
      #s6-kb {
        position: absolute;
        inset: 0;
      }
      #s6-text {
        justify-content: center;
        align-items: flex-start;
        padding-top: 260px;
        padding-bottom: 700px;
        gap: 34px;
      }
      #s6-row {
        display: flex;
        align-items: center;
        gap: 36px;
      }
      #s6-counter {
        font-family: "Anton", sans-serif;
        font-size: 300px;
        line-height: 1.12;
        color: var(--gold);
        font-variant-numeric: tabular-nums;
        min-width: 560px;
      }
      #s6-arrow {
        width: 120px;
        height: 150px;
      }
      #s6-source {
        font-size: 30px;
        letter-spacing: 0.16em;
        color: var(--text-2);
      }
      #s6-source-2 {
        font-size: 40px;
        color: var(--text-2);
      }

      /* ── 7. black friday ─────────────────────────────────────────── */
      #s7-header {
        position: absolute;
        left: 0;
        right: 0;
        top: 470px;
        height: 330px;
        overflow: hidden;
      }
      #s7-header-kb {
        position: absolute;
        inset: 0;
      }
      #s7-header-kb img {
        position: absolute;
        width: 2040px;
        left: -257px;
        top: -20px;
        display: block;
      }
      #s7-sub {
        position: absolute;
        left: 72px;
        right: 150px;
        top: 850px;
        font-size: 60px;
        line-height: 1.12;
        color: var(--gold);
        text-align: center;
      }

      /* ── 8. epilogue ─────────────────────────────────────────────── */
      #s8-content {
        gap: 24px;
      }
      #s8-portrait {
        width: 560px;
      }
      #s8-portrait .frame {
        height: 700px;
        border-color: rgba(244, 246, 251, 0.55);
      }
      #s8-portrait img {
        filter: grayscale(1) contrast(1.05);
      }
      #s8-date {
        font-family: "DM Serif Display", serif;
        font-size: 88px;
        line-height: 1;
        color: var(--text);
      }
      #s8-line {
        font-size: 44px;
        color: var(--text-2);
        max-width: 820px;
        line-height: 1.2;
      }

      /* ── 9. end card ─────────────────────────────────────────────── */
      #s9-content {
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 200px 110px 420px 110px;
        gap: 26px;
      }
      #s9-icon {
        width: 190px;
        height: 190px;
        border-radius: 44px;
        box-shadow: 0 0 60px rgba(245, 183, 59, 0.35);
        display: block;
      }
      #s9-story {
        font-size: 64px;
        line-height: 1.1;
        max-width: 820px;
      }
      #s9-name {
        font-family: "Anton", sans-serif;
        font-size: 118px;
        letter-spacing: 0.02em;
        line-height: 1;
        color: var(--text);
      }
      #s9-tag {
        font-size: 48px;
        color: var(--gold);
      }
      #s9-cta {
        font-family: "Anton", sans-serif;
        font-size: 50px;
        letter-spacing: 0.12em;
        color: var(--void);
        background: var(--gold);
        border-radius: 999px;
        padding: 20px 60px;
        margin-top: 10px;
      }
      #s9-credit {
        position: absolute;
        left: 90px;
        right: 90px;
        top: 1432px;
        font-family: "DM Serif Display", serif;
        font-size: 24px;
        color: rgba(244, 246, 251, 0.62);
        text-align: center;
      }

      /* ── captions ────────────────────────────────────────────────── */
      #captions {
        position: absolute;
        left: 60px;
        right: 140px;
        top: 1180px;
        height: 200px;
        z-index: 50;
        pointer-events: none;
      }
      .cg {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        text-align: center;
        font-family: "Anton", sans-serif;
        font-size: 80px;
        line-height: 1.05;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        color: var(--text);
        text-shadow:
          0 4px 22px rgba(0, 0, 0, 0.9),
          0 0 3px rgba(0, 0, 0, 0.9);
        opacity: 0;
      }
      .cg .hl {
        color: var(--gold);
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{{total}}" data-width="1080" data-height="1920">
      <!-- 1 ── ON THIS DAY, 1869 ─────────────────────────────────────── -->
      <div id="scene1" class="scene clip" data-start="{{scene1.start}}" data-duration="{{scene1.duration}}" data-track-index="1" style="z-index: 1">
        <div class="layer solid"></div>
        <div id="s1-kb" class="layer" data-layout-allow-overflow>
          <img class="cover" src="assets/black-friday.jpg" alt="" style="object-position: 30% 45%" />
        </div>
        <div class="layer shade"></div>
        <div class="layer glow"></div>
        <div class="content">
          <div id="s1-kicker" class="kicker">On this day</div>
          <div id="s1-date">24 SEPTEMBER</div>
          <div id="s1-year">1869</div>
          <div id="s1-rule" class="rule"></div>
          <div id="s1-where" class="italic">The Gold Room, New York</div>
        </div>
      </div>

      <!-- 2 ── THE GOLD RING ─────────────────────────────────────────── -->
      <div id="scene2" class="scene clip" data-start="{{scene2.start}}" data-duration="{{scene2.duration}}" data-track-index="2" style="z-index: 2">
        <div id="s2-fade" class="layer">
          <div class="layer solid"></div>
          <div class="layer glow"></div>
          <div class="content">
            <div id="s2-kicker" class="kicker">The Gold Ring</div>
            <div class="pair">
              <div id="s2-card-a" class="card">
                <div class="frame"><img id="s2-img-a" data-layout-allow-overflow src="assets/gould.jpg" alt="" /></div>
                <div class="label">Jay Gould</div>
                <div class="role italic">railroad magnate</div>
              </div>
              <div id="s2-card-b" class="card">
                <div class="frame"><img id="s2-img-b" data-layout-allow-overflow src="assets/fisk.png" alt="" /></div>
                <div class="label">James Fisk</div>
                <div class="role italic">his partner</div>
              </div>
            </div>
            <div id="s2-plan">
              <svg id="s2-up" viewBox="0 0 120 150" aria-hidden="true">
                <path d="M60 0 L120 90 L82 90 L82 150 L38 150 L38 90 L0 90 Z" fill="#f5b73b" />
              </svg>
              <div id="s2-where" class="label">Force up gold · New York Gold Exchange</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3 ── THE PROBLEM: THE TREASURY SELLS ───────────────────────── -->
      <div id="scene3" class="scene clip" data-start="{{scene3.start}}" data-duration="{{scene3.duration}}" data-track-index="3" style="z-index: 3">
        <div id="s3-fade" class="layer">
          <div class="layer solid"></div>
          <div class="layer glow"></div>
          <div class="content">
            <div id="s3-kicker" class="kicker">One problem</div>
            <div id="s3-main" class="serif">Every two weeks, the Treasury sold gold.</div>
            <div id="s3-cal"></div>
            <div id="s3-foot" class="italic">The Treasury’s sales kept the dollar stable</div>
          </div>
        </div>
      </div>

      <!-- 4 ── THE INSIDE MAN (hard cut) ─────────────────────────────── -->
      <div id="scene4" class="scene clip" data-start="{{scene4.start}}" data-duration="{{scene4.duration}}" data-track-index="4" style="z-index: 4">
        <div class="layer solid"></div>
        <div id="s4-ghost" data-layout-ignore>INSIDE MAN</div>
        <div class="content">
          <div id="s4-way" class="italic">So they found a way in.</div>
          <div id="s4-kicker" class="kicker">The inside man</div>
          <div id="s4-main" class="serif">The President’s own brother&#8209;in&#8209;law.</div>
          <div id="s4-rule" class="rule"></div>
          <div id="s4-fact" class="italic">Abel Corbin — married to Grant’s younger sister</div>
        </div>
      </div>

      <!-- 5 ── GRANT ORDERS THE SALE ─────────────────────────────────── -->
      <div id="scene5" class="scene clip" data-start="{{scene5.start}}" data-duration="{{scene5.duration}}" data-track-index="5" style="z-index: 5">
        <div id="s5-fade" class="layer">
          <div class="layer solid"></div>
          <div id="s5-kb" class="layer" data-layout-allow-overflow>
            <img class="cover" src="assets/grant.jpg" alt="" style="object-position: 50% 18%" />
          </div>
          <div class="layer shade"></div>
          <div id="s5-text" class="content">
            <div id="s5-when" class="label">Friday · 24 September 1869</div>
            <div id="s5-name" class="label" style="font-size: 50px">President Ulysses S. Grant</div>
            <div id="s5-line" class="italic">orders the Treasury to sell gold</div>
          </div>
        </div>
      </div>

      <!-- 6 ── THE CRASH, FROM THE BOARD ITSELF ──────────────────────── -->
      <div id="scene6" class="scene clip" data-start="{{scene6.start}}" data-duration="{{scene6.duration}}" data-track-index="6" style="z-index: 6">
        <div id="s6-fade" class="layer">
          <div class="layer solid"></div>
          <div id="s6-kb" data-layout-allow-overflow>
            <img class="cover" src="assets/board-s4.jpg" alt="" style="object-position: 38% 50%" />
          </div>
          <div class="layer shade"></div>
          <!-- Overlap flagged by `check` is the Anton glyph box, not ink:
               verified in snapshots, the lines read cleanly. -->
          <div id="s6-text" class="content" data-layout-allow-overlap>
            <div id="s6-source" class="label" data-layout-allow-overlap>Gold, New York · 24 Sept 1869</div>
            <div id="s6-row">
              <div id="s6-counter" data-layout-allow-overlap>162½</div>
              <svg id="s6-arrow" viewBox="0 0 120 150" aria-hidden="true">
                <path d="M60 150 L0 60 L38 60 L38 0 L82 0 L82 60 L120 60 Z" fill="#ff5470" />
              </svg>
            </div>
            <div id="s6-source-2" class="italic" data-layout-allow-overlap>from the Gold Room’s bulletin board that day</div>
          </div>
        </div>
      </div>

      <!-- 7 ── BLACK FRIDAY (hard cut) ───────────────────────────────── -->
      <div id="scene7" class="scene clip" data-start="{{scene7.start}}" data-duration="{{scene7.duration}}" data-track-index="7" style="z-index: 7">
        <div class="layer solid"></div>
        <div class="layer glow"></div>
        <div id="s7-header">
          <div id="s7-header-kb" data-layout-allow-overflow><img src="assets/board-s5.jpg" alt="" /></div>
        </div>
        <div id="s7-sub" class="italic">The gold panic of 1869</div>
      </div>

      <!-- 8 ── EPILOGUE: FISK ────────────────────────────────────────── -->
      <div id="scene8" class="scene clip" data-start="{{scene8.start}}" data-duration="{{scene8.duration}}" data-track-index="8" style="z-index: 8">
        <div id="s8-fade" class="layer">
          <div class="layer solid"></div>
          <div id="s8-content" class="content">
            <div id="s8-kicker" class="kicker" style="color: rgba(244, 246, 251, 0.8)">Epilogue</div>
            <div id="s8-portrait">
              <div class="frame"><img id="s8-img" data-layout-allow-overflow src="assets/fisk-s8.png" alt="" /></div>
            </div>
            <div id="s8-date">7 January 1872</div>
            <div id="s8-line" class="italic">James Fisk is assassinated in New York</div>
          </div>
        </div>
      </div>

      <!-- 9 ── END CARD ──────────────────────────────────────────────── -->
      <div id="scene9" class="scene clip" data-start="{{scene9.start}}" data-duration="{{scene9.duration}}" data-track-index="9" style="z-index: 9">
        <div id="s9-fade" class="layer">
          <div class="layer solid"></div>
          <div id="s9-bg" class="layer" style="opacity: 0.14">
            <img class="cover" src="assets/board-s6.jpg" alt="" style="object-position: 50% 50%" />
          </div>
          <div class="layer glow"></div>
          <div id="s9-content" class="content">
            <img id="s9-icon" src="assets/icon.png" alt="" />
            <div id="s9-story" class="serif">Every day has a story like this.</div>
            <div id="s9-name">HISTORY UNLOCKED</div>
            <div id="s9-tag" class="italic">Today, but every year at once</div>
            <div id="s9-cta">LINK IN BIO</div>
          </div>
          <div id="s9-credit">
            Images: Library of Congress &amp; Wikimedia Commons · public domain. Sources: Wikipedia.
          </div>
        </div>
      </div>

      <!-- captions, built from TIMINGS below -->
      <div id="captions" class="clip" data-start="0" data-duration="{{captions.duration}}" data-track-index="10"></div>

      <audio id="narration" data-start="0" data-duration="{{narration}}" data-track-index="0" src="narration.wav" data-volume="1"></audio>
    </div>

    <script>
      /*
       * Filled by tools/build-composition.mjs from the measured narration:
       *   T.seg[id]      when each phrase is spoken ({ start, end, show })
       *   T.scene[id]    each scene's window ({ start, end, duration })
       *   T.captions     the phrases that get captions
       * Every cue below is written against one of these — no hand-typed seconds.
       */
      var T = /*TIMINGS*/ null;
      var G = T.seg;
      var S = T.scene;

      // A point a fraction of the way through a phrase — for a cue that lands
      // mid-sentence, since a phrase is timed as a whole.
      function within(id, fraction) {
        return G[id].start + (G[id].end - G[id].start) * fraction;
      }

      // Words that carry the story get the gold.
      var KEY = {
        1869: 1, GOLD: 1, JAY: 1, GOULD: 1, JAMES: 1, FISK: 1, TREASURY: 1, SELL: 1,
        "PRESIDENT'S": 1, "BROTHER-IN-LAW": 1, GRANT: 1, "162½": 1, 133: 1,
        COLLAPSED: 1, BLACK: 1, FRIDAY: 1, ASSASSINATED: 1, INSIDE: 1,
      };

      function groupsOf(phrase) {
        // Break at punctuation first, so a group never straddles a pause, then
        // split each piece into BALANCED chunks of at most 4 words. Greedy
        // groups of 4 stranded a last word alone — "They called it Black" /
        // "Friday." — splitting the one phrase the video builds to.
        var words = phrase.show.split(/\s+/);
        var parts = [];
        var part = [];
        words.forEach(function (w, i) {
          part.push(w);
          if (/[.,?!]$/.test(w) || i === words.length - 1) {
            parts.push(part);
            part = [];
          }
        });
        var groups = [];
        parts.forEach(function (p) {
          var chunks = Math.ceil(p.length / 4);
          var base = Math.floor(p.length / chunks);
          var extra = p.length % chunks;
          var at = 0;
          for (var c = 0; c < chunks; c++) {
            var size = base + (c < extra ? 1 : 0);
            groups.push(p.slice(at, at + size));
            at += size;
          }
        });
        // Share the phrase's spoken span in proportion to characters.
        var total = groups.reduce(function (n, g) {
          return n + g.join(" ").length;
        }, 0);
        var span = phrase.end - phrase.start;
        var t = phrase.start;
        return groups.map(function (g) {
          var d = (span * g.join(" ").length) / total;
          var out = { words: g, start: t, end: t + d };
          t += d;
          return out;
        });
      }

      var GROUPS = [];
      T.captions.forEach(function (p) {
        GROUPS = GROUPS.concat(groupsOf(p));
      });

      var box = document.getElementById("captions");
      GROUPS.forEach(function (g, i) {
        var el = document.createElement("div");
        el.className = "cg";
        el.id = "cg-" + i;
        el.innerHTML = g.words
          .map(function (w) {
            var bare = w.toUpperCase().replace(/[.,?!]+$/, "");
            return KEY[bare] ? '<span class="hl">' + w + "</span>" : w;
          })
          .join(" ");
        box.appendChild(el);
        if (window.__hyperframes && window.__hyperframes.fitTextFontSize) {
          var fit = window.__hyperframes.fitTextFontSize(g.words.join(" ").toUpperCase(), {
            fontFamily: "Anton",
            fontWeight: 400,
            maxWidth: 860,
            baseFontSize: 80,
            minFontSize: 54,
          });
          el.style.fontSize = fit.fontSize + "px";
        }
      });

      // The Treasury's calendar: four weeks, a sale every fourteenth day.
      var cal = document.getElementById("s3-cal");
      for (var r = 0; r < 2; r++) {
        var row = document.createElement("div");
        row.className = "cal-row";
        for (var c = 0; c < 14; c++) {
          var cell = document.createElement("div");
          cell.className = "cal-cell";
          cell.id = "cal-" + (r * 14 + c + 1);
          row.appendChild(cell);
        }
        cal.appendChild(row);
      }
      var sell = document.createElement("div");
      sell.className = "cal-sell";
      sell.id = "cal-label";
      sell.textContent = "■ = TREASURY SELLS GOLD";
      cal.appendChild(sell);

      var tl = gsap.timeline({ paused: true });

      // ── 1. ON THIS DAY, 1869 ── build fast, breathe on the board ────────
      tl.fromTo("#s1-kb", { scale: 1.14 }, { scale: 1.0, duration: S.scene1.duration, ease: "none" }, 0);
      tl.fromTo("#s1-kicker", { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, 0.15);
      tl.fromTo("#s1-date", { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out", transformOrigin: "0% 50%" }, 0.3);
      tl.fromTo("#s1-year", { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.6)", transformOrigin: "0% 60%" }, 0.45);
      tl.fromTo("#s1-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power4.out", transformOrigin: "0% 50%" }, 0.85);
      tl.fromTo("#s1-where", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "sine.out" }, 1.15);

      // ── 2. THE GOLD RING ── two men arrive from opposite sides ──────────
      var t2 = S.scene2.start;
      tl.fromTo("#s2-fade", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, t2);
      tl.fromTo("#s2-kicker", { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, t2 + 0.15);
      tl.fromTo("#s2-card-a", { opacity: 0, x: -90 }, { opacity: 1, x: 0, duration: 0.7, ease: "power4.out" }, t2 + 0.25);
      tl.fromTo("#s2-card-b", { opacity: 0, x: 90 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, G.s2.start + 0.9);
      tl.fromTo("#s2-img-a", { scale: 1.0 }, { scale: 1.1, duration: S.scene2.duration, ease: "none" }, t2);
      tl.fromTo("#s2-img-b", { scale: 1.09 }, { scale: 1.0, duration: S.scene2.duration, ease: "none" }, t2);
      // "Buy up the gold, and force the price up…" — the plan, as it is said.
      tl.fromTo("#s2-plan", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "circ.out" }, within("s2", 0.45));
      tl.fromTo("#s2-up", { y: 20 }, { y: -8, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 5, immediateRender: false }, within("s2", 0.5));

      // ── 3. THE PROBLEM ── the calendar fills, every fourteenth day lights ─
      var t3 = S.scene3.start;
      tl.fromTo("#s3-fade", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, t3);
      tl.fromTo("#s3-kicker", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, t3 + 0.15);
      tl.fromTo("#s3-main", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, within("s3", 0.3));
      var calStart = within("s3", 0.4);
      for (var d = 1; d <= 28; d++) {
        tl.fromTo("#cal-" + d, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, calStart + d * 0.035);
      }
      tl.fromTo("#cal-14", { backgroundColor: "rgba(244,246,251,0.06)" }, { backgroundColor: "#f5b73b", duration: 0.25, ease: "power2.out" }, calStart + 1.2);
      tl.fromTo("#cal-28", { backgroundColor: "rgba(244,246,251,0.06)" }, { backgroundColor: "#f5b73b", duration: 0.25, ease: "power2.out" }, calStart + 1.6);
      tl.fromTo("#cal-label", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "sine.out" }, calStart + 1.8);
      tl.fromTo("#s3-foot", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "sine.out" }, calStart + 2.3);

      // ── 4. THE INSIDE MAN ── hard cut; the answer waits for its word ────
      var t4 = S.scene4.start;
      tl.fromTo("#s4-ghost", { x: 0 }, { x: -200, duration: S.scene4.duration, ease: "none" }, t4);
      tl.fromTo("#s4-way", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, t4 + 0.05);
      tl.fromTo("#s4-kicker", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, G.s4b.start);
      tl.fromTo("#s4-main", { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, G.s4c.start);
      tl.fromTo("#s4-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power4.out", transformOrigin: "0% 50%" }, G.s4c.start + 0.5);
      tl.fromTo("#s4-fact", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: "sine.out" }, G.s4c.start + 0.9);

      // ── 5. GRANT ── the order, dated ────────────────────────────────────
      var t5 = S.scene5.start;
      tl.fromTo("#s5-fade", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, t5);
      tl.fromTo("#s5-kb", { scale: 1.0 }, { scale: 1.08, duration: S.scene5.duration, ease: "none" }, t5);
      tl.fromTo("#s5-when", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, t5 + 0.2);
      tl.fromTo("#s5-name", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }, within("s5a", 0.4));
      tl.fromTo("#s5-line", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "sine.out" }, within("s5a", 0.65));

      // ── 6. THE CRASH ── 162½ to 133, counted as it is said ──────────────
      var t6 = S.scene6.start;
      tl.fromTo("#s6-fade", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" }, t6);
      tl.fromTo("#s6-kb", { scale: 1.25 }, { scale: 1.06, duration: S.scene6.duration, ease: "power1.out" }, t6);
      tl.fromTo("#s6-source", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, t6 + 0.15);
      tl.fromTo("#s6-row", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)", transformOrigin: "0% 50%" }, t6 + 0.2);
      var price = { v: 162.5 };
      var counter = document.getElementById("s6-counter");
      function showPrice() {
        counter.textContent = price.v > 162.25 ? "162½" : String(Math.round(price.v));
      }
      // "…From one sixty-two and a half, to one thirty-three" — the fall runs
      // across exactly those words.
      var fallFrom = within("s5b", 0.38);
      var fallTo = G.s5b.end - 0.2;
      tl.fromTo(price, { v: 162.5 }, { v: 133, duration: fallTo - fallFrom, ease: "power2.in", onUpdate: showPrice, onComplete: showPrice }, fallFrom);
      tl.fromTo("#s6-counter", { color: "#f5b73b" }, { color: "#ff5470", duration: 0.9, ease: "power1.in" }, fallFrom + 0.6);
      tl.fromTo("#s6-arrow", { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.in" }, fallFrom + 0.7);
      tl.fromTo("#s6-source-2", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "sine.out" }, fallTo);

      // ── 7. BLACK FRIDAY ── hard cut to the board's own lettering ────────
      var t7 = S.scene7.start;
      tl.fromTo("#s7-header-kb", { scale: 1.35, opacity: 0 }, { scale: 1.02, opacity: 1, duration: 0.7, ease: "expo.out" }, t7 + 0.02);
      tl.fromTo("#s7-sub", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, t7 + 0.62);

      // ── 8. EPILOGUE ── slower, quieter: this is a death, not a payoff ───
      var t8 = S.scene8.start;
      tl.fromTo("#s8-fade", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.inOut" }, t8);
      tl.fromTo("#s8-kicker", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.out" }, t8 + 0.2);
      tl.fromTo("#s8-portrait", { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "sine.out" }, t8 + 0.3);
      tl.fromTo("#s8-img", { scale: 1.0 }, { scale: 1.06, duration: S.scene8.duration, ease: "none" }, t8);
      tl.fromTo("#s8-date", { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "sine.out" }, G.s7b.start);
      tl.fromTo("#s8-line", { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "sine.out" }, within("s7b", 0.55));

      // ── 9. END CARD ── the app, then its name as it is spoken, then the ask
      var t9 = S.scene9.start;
      tl.fromTo("#s9-fade", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, t9);
      tl.fromTo("#s9-icon", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" }, t9 + 0.15);
      tl.fromTo("#s9-story", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, G.s8a.start + 0.05);
      tl.fromTo("#s9-name", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" }, G.s8b.start);
      tl.fromTo("#s9-tag", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.out" }, G.s8b.start + 0.5);
      tl.fromTo("#s9-cta", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, G.s8c.start);
      tl.fromTo("#s9-cta", { scale: 1 }, { scale: 1.06, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 1, immediateRender: false }, G.s8c.start + 0.55);
      tl.fromTo("#s9-credit", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "sine.out" }, G.s8b.start + 0.2);
      // Final scene only: fade to black.
      tl.fromTo("#s9-content", { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power2.in" }, T.total - 0.45);

      // ── captions: pop in, fall away, hard kill ──────────────────────────
      GROUPS.forEach(function (g, i) {
        var sel = "#cg-" + i;
        tl.fromTo(sel, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.14, ease: "back.out(1.7)" }, g.start);
        tl.to(sel, { opacity: 0, duration: 0.1, ease: "power2.in" }, g.end - 0.1);
        tl.set(sel, { opacity: 0, visibility: "hidden" }, g.end);
      });

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
