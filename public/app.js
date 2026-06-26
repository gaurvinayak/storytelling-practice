/* Storytelling Practice — single-page app.
 * State lives in localStorage. AI coaching goes through /api/coach -> Claude CLI.
 */

// ----------------------------------------------------------------------------
// Storage
// ----------------------------------------------------------------------------
const DB = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};
const PROGRESS = "st_progress_v1";   // { [moduleId]: { gotIt: bool } }
const DRILLS = "st_drills_v1";       // { [drillId]: { fields..., feedback } }
const SWIPE = "st_swipe_v1";         // [ {id,title,source,url,hook,loop,turn,cut,createdAt} ]
const BANK = "st_bank_v1";           // [ {id,text,tag,createdAt} ]

function getProgress() { return DB.get(PROGRESS, {}); }
function setGotIt(modId, val) { const p = getProgress(); p[modId] = { ...(p[modId]||{}), gotIt: val }; DB.set(PROGRESS, p); }
function drillState(id) { return DB.get(DRILLS, {})[id] || {}; }
function saveDrill(id, data) { const all = DB.get(DRILLS, {}); all[id] = { ...(all[id]||{}), ...data }; DB.set(DRILLS, all); }

function uid() { return Math.random().toString(36).slice(2, 10) + (performance.now()|0).toString(36); }
function nowStr() { const d = new Date(); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
const esc = (s) => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ----------------------------------------------------------------------------
// Curriculum data
// ----------------------------------------------------------------------------
const PHASES = [
  { id:"p1", name:"Phase 1 — Foundations", tag:"The atom of story" },
  { id:"p2", name:"Phase 2 — The Hook", tag:"Highest-leverage skill" },
  { id:"p3", name:"Phase 3 — Structure & Voice", tag:"Assemble the whole piece" },
  { id:"p4", name:"Phase 4 — Format & Systems", tag:"Different containers, lasting engine" },
];

// Shared coaching preamble fragments
const COACH = "You are a sharp, experienced storytelling coach for short-form content, newsletters, and technical teardowns. You are direct and specific, never vague praise. ";

const MODULES = [
  // ---------------- PHASE 1 ----------------
  {
    id:"m1", phase:"p1", num:1, title:"Cause, Not Sequence",
    objective:"Tell the difference between a story and a list of events — and never publish the second.",
    blurb:"A story is a chain of <b>because</b>: this happened, and <i>because of that</i>, this. Causality makes the brain lean in. Most weak content is all \"and then\" — a report the brain reads as noise.",
    gotIt:"You can read any piece of content and instantly feel whether it's a chain or a list.",
    drills:[
      {
        id:"m1d1", type:"becauseChain", title:"Rep 1 — The because-chain rewrite",
        instructions:"Paste a post (or a draft). The tool highlights your connectors: <mark class='bad'>sequence joins</mark> like \"and then\" vs <mark class='good'>causal joins</mark> like \"because / so / which meant\". If most beats join with \"and then\", you've written a report. Rewrite it as a because-chain below, then get coached.",
        task: COACH + "The student is practicing Module 1: Cause, Not Sequence. Judge whether their text is a genuine causal chain (each beat happens BECAUSE of the previous one, implying consequence and stakes) or just a sequence/report (\"this happened, then this happened\"). Identify specific weak connectors and show how to convert two of them into causal links. Reward real cause-and-effect; penalize 'and then' chaining.",
      },
      {
        id:"m1d2", type:"spine", title:"Rep 2 — Force it into the story spine",
        instructions:"Pull a raw entry from your Story Bank and force it into the improv story spine. The load-bearing line is <b>\"Until one day\"</b> — the single disruption. If you can't fill it with a real turn, this is an anecdote, not a story yet.",
        task: COACH + "The student filled the improv story spine (Once there was / Every day / Until one day / Because of that x2 / Until finally / And ever since). Evaluate: Is there ONE real disruption at 'Until one day' (not just more setup)? Does everything after it follow as genuine cause-and-effect? Is there too much 'Every day' (context) and a weak or missing turn? Tell them bluntly whether this is a story or still an anecdote, and what the real turn could be.",
      },
    ],
  },
  {
    id:"m2", phase:"p1", num:2, title:"The Open Loop",
    objective:"Treat attention as a resource you manage, not something you hope for.",
    blurb:"Storytelling is <b>attention management</b>: open a gap — a question, a tension, an incomplete picture — and don't close it until you've carried the reader where you want them. The skill is two halves: open early, and <i>don't close too fast</i>.",
    gotIt:"You can name, for any post, the exact loop holding the reader and the exact line where it closes.",
    drills:[
      {
        id:"m2d1", type:"fiveLines", title:"Rep 1 — Five first lines that force line two",
        instructions:"Write 5 first lines whose only job is to make the second line non-optional. The test: a good first line is <b>useless on its own</b>. Read just the line — do you <i>need</i> the next one?",
        task: COACH + "The student wrote 5 candidate first lines. For EACH line, judge one thing: does it force the reader into line two (open an unresolved loop), or is it self-contained / throat-clearing? Score each line's pull. Call out which lines close their own loop (answer themselves) and which are merely topic announcements. Name the single strongest line and why.",
      },
      {
        id:"m2d2", type:"loop", title:"Rep 2 — Open a loop, pay it off late",
        instructions:"Write an opening that plants a loop, and mark where you open it and where you close it. Hold the gap — pay it off in the final third, not line two.",
        task: COACH + "The student wrote an opening plus where they think the loop opens and closes. Evaluate: Is there a clear unresolved gap? Do they close it too early (the classic beginner mistake of answering the hook in line two)? Is the gap strong enough to carry a reader? Tell them exactly where the loop actually closes in their text vs where they think it does.",
      },
    ],
  },
  {
    id:"m3", phase:"p1", num:3, title:"Specificity & Showing",
    objective:"Replace abstraction with concrete, sensory detail as a reflex.",
    blurb:"\"It was a hard year\" is forgettable. \"I ate the same instant noodles for four months\" lands. The sharper rule for content: <b>show the struggle, don't display the trophy.</b> Messy middles read like people; polished outcomes read like case studies.",
    gotIt:"Vague phrasing physically bothers you, and your hand reaches for the specific before you decide to.",
    drills:[
      {
        id:"m3d1", type:"abstraction", title:"Rep 1 — Abstraction hunt",
        instructions:"Paste any post. The tool underlines <mark class='abstract'>abstract words</mark> (hard, amazing, scalable, growth, things…). Replace each with a concrete image, number, or moment in the rewrite box, then get coached on what's still vague.",
        task: COACH + "The student is practicing Module 3: Specificity. Hunt their rewrite for remaining abstraction — every general claim, adjective, or vague noun (hard, amazing, scalable, growth, journey, things, a lot). For each one still present, demand the specific image/number/moment that should replace it. Reward concrete sensory detail and specific numbers. The standard: could the reader SEE it?",
      },
      {
        id:"m3d2", type:"showTell", title:"Rep 2 — Show vs tell, same story",
        instructions:"Write the same true story twice: once <b>telling</b> (summary, conclusions, adjectives), once <b>showing</b> (one specific scene, no adjectives, let the reader conclude). Feel the gap.",
        task: COACH + "The student wrote the same story twice — a 'telling' version and a 'showing' version. Judge the showing version: does it use one concrete scene with sensory detail and NO conclusion-adjectives, letting the reader draw the conclusion themselves? Point out anywhere the 'showing' version is secretly still 'telling' (states a feeling/judgment instead of dramatizing it). Compare the emotional impact of the two.",
      },
    ],
  },
  // ---------------- PHASE 2 ----------------
  {
    id:"m4", phase:"p2", num:4, title:"Hook Anatomy & Archetypes",
    objective:"Generate strong hooks on demand instead of waiting for one to arrive.",
    blurb:"A hook's only job is to <b>buy the next line</b> — not to summarize, not to look professional. Throat-clearing (\"Today I want to talk about…\") is the fastest way to lose people. Learn the archetypes as a toolkit you rotate, not a formula you repeat.",
    gotIt:"\"I don't have a good hook\" is replaced by \"let me write ten and pick.\"",
    drills:[
      { id:"m4d1", type:"generic", title:"Rep 1 — The 10-hook rule",
        instructions:"For your next piece, write 10 hooks <b>before</b> a word of the body. Your first hook is almost never your best — it's the obvious one. The good one is usually #6–9.",
        note:"Ship nothing until all 10 exist. The counter tracks you.",
        fields:[
          {key:"idea",kind:"text",label:"The one idea / topic",ph:"What's this piece about?"},
          ...Array.from({length:10},(_,i)=>({key:"h"+(i+1),kind:"text",label:"Hook "+(i+1),ph:i<1?"the obvious one…":(i>=5?"now push past obvious…":"…")})),
        ],
        counters:[{type:"filledCount",keys:Array.from({length:10},(_,i)=>"h"+(i+1)),label:"Hooks written",target:10}],
        task: COACH + "The student wrote up to 10 candidate hooks for one idea (Module 4). For the set: which hooks genuinely BUY the next line (force a stop) vs which are throat-clearing or topic announcements? Flag any that summarize instead of provoke. Name the 2-3 strongest and exactly why. Note which archetype they over-rely on (contrarian / curiosity gap / stakes / specificity / pattern-interrupt). Push them toward the non-obvious #6-9 territory.",
      },
      { id:"m4d2", type:"generic", title:"Rep 2 — Rotate the five archetypes",
        instructions:"Take one idea and write it as all five hook types. You'll find the idea is more flexible than you thought — and discover which archetype you over-rely on.",
        fields:[
          {key:"idea",kind:"text",label:"The one idea",ph:"e.g. most teams adopt microservices too early"},
          {key:"contrarian",kind:"text",label:"Contrarian",hint:"attack a thing the reader believes",ph:"\"X was a mistake for most teams.\""},
          {key:"curiosity",kind:"text",label:"Curiosity gap",hint:"state outcome, withhold mechanism",ph:"\"This one change cut latency in half. It took a year to find.\""},
          {key:"stakes",kind:"text",label:"Stakes / cost",hint:"lead with what was on the line",ph:"\"This bug cost us $40k before anyone noticed.\""},
          {key:"specificity",kind:"text",label:"Specificity as intrigue",hint:"a detail so concrete it implies a story",ph:"\"On day 3, the database started lying to us.\""},
          {key:"interrupt",kind:"text",label:"Pattern interrupt",hint:"break the feed's rhythm",ph:"\"Nobody asked, but your retry logic is wrong.\""},
        ],
        task: COACH + "The student wrote one idea as five hook archetypes (Module 4). For EACH: does it actually fit its archetype, and does it buy the next line? Call out any that are mislabeled (e.g. a 'contrarian' that isn't really attacking a belief). Name the strongest of the five and the weakest, and which archetype reads as their natural/over-used lane.",
      },
    ],
  },
  {
    id:"m5", phase:"p2", num:5, title:"Hook–Payoff Integrity",
    objective:"Earn the click without becoming the thing you hate.",
    blurb:"The hook is a <b>promise</b>; the body is the <b>delivery</b>. Bait gets the open and kills the trust — and the algorithm reads the bounce. One earned turn beats three asserted ones. The reframe should be <i>arrived at</i>, not stated.",
    gotIt:"You can articulate the promise/payoff pair for anything you publish, and they're the same size.",
    drills:[
      { id:"m5d1", type:"generic", title:"Rep 1 — Promise vs payoff, three pieces",
        instructions:"For 3 of your pieces, write the promise the hook makes (one sentence) and the payoff the body delivers (one sentence). Where they don't match, <b>fix the body — never weaken the hook</b>.",
        fields:[
          {key:"p1",kind:"text",label:"Piece 1 — the promise the hook makes",ph:"In one sentence…"},
          {key:"d1",kind:"text",label:"Piece 1 — the payoff the body delivers",ph:"In one sentence…"},
          {key:"p2",kind:"text",label:"Piece 2 — promise"},
          {key:"d2",kind:"text",label:"Piece 2 — payoff"},
          {key:"p3",kind:"text",label:"Piece 3 — promise"},
          {key:"d3",kind:"text",label:"Piece 3 — payoff"},
        ],
        task: COACH + "The student listed promise/payoff pairs for up to 3 pieces (Module 5). For each pair, judge: are the promise and the payoff the SAME SIZE? Flag over-promising (bait) and under-delivering. For any mismatch, prescribe fixing the body to meet the hook — never weakening the hook. Be specific about which pair is the worst offender.",
      },
      { id:"m5d2", type:"generic", title:"Rep 2 — Arrive at the reframe, don't state it",
        instructions:"Find a piece where you <i>stated</i> the reframe. Rewrite it so the reader <b>reaches</b> the reframe a beat before you confirm it. That reader-gets-it-then-you-confirm gap is the most satisfying moment in content.",
        fields:[
          {key:"stated",kind:"area",label:"Reframe stated outright",ph:"\"The lesson is that hiring senior too early slows you down.\""},
          {key:"arrived",kind:"area",label:"Rewritten so the reader arrives at it first",ph:"Show the scene; let them conclude; then confirm."},
        ],
        task: COACH + "The student rewrote a stated reframe into an arrived-at one (Module 5). Judge the rewrite: does the reader actually reach the conclusion a beat BEFORE the writer states it, or is it still asserted? Point to the exact line where the reader 'gets it' and whether the confirmation lands after that, not before. If it's still telling, show how to dramatize it instead.",
      },
    ],
  },
  // ---------------- PHASE 3 ----------------
  {
    id:"m6", phase:"p3", num:6, title:"Post Architecture",
    objective:"Control the full shape of a piece, from cold open to final beat.",
    blurb:"The skeleton: <b>hook → context (minimum viable) → tension → turn → resolution → exit.</b> The two bloat zones are context (give the least the reader needs) and the exit (one clean landing). Tension is the load-bearing wall — no problem alive in the middle and it collapses into a list.",
    gotIt:"You outline in beats before you write sentences, automatically.",
    drills:[
      { id:"m6d1", type:"generic", title:"Rep 1 — Skeleton-first drafting",
        instructions:"Write only the skeleton first — <b>one line per beat</b> — before any prose. Most structural problems are visible here and invisible once you've written sentences you're attached to.",
        fields:[
          {key:"hook",kind:"text",label:"Hook",ph:"the line that buys the next line"},
          {key:"context",kind:"text",label:"Context",hint:"minimum viable — the least they need",ph:"one line of setup, no more"},
          {key:"tension",kind:"text",label:"Tension",hint:"the load-bearing wall",ph:"the problem/gap/question alive in the middle"},
          {key:"turn",kind:"text",label:"Turn",hint:"the reframe / 'oh'",ph:"what flips"},
          {key:"resolution",kind:"text",label:"Resolution",ph:"what the turn resolves to"},
          {key:"exit",kind:"text",label:"Exit",hint:"one clean landing",ph:"land the turn — don't summarize"},
        ],
        task: COACH + "The student wrote a six-beat skeleton (Module 6). Evaluate the STRUCTURE, not prose: Is there real tension in the middle (a live problem/question), or does it sag into a list? Is the context minimal or bloated? Does the turn actually turn (vs restate the hook)? Is the exit one clean landing or throat-clearing? Name the weakest beat and how to fix it at skeleton stage.",
      },
      { id:"m6d2", type:"generic", title:"Rep 2 — Rebuild a flat post on the skeleton",
        instructions:"Take a flat, corporate post and rebuild it on the skeleton <b>without adding a single new fact</b>. Same information, story shape. This is the core move of the teardown.",
        fields:[
          {key:"flat",kind:"area",label:"The flat / corporate version",ph:"Paste the lifeless version…"},
          {key:"rebuilt",kind:"area",label:"Rebuilt — same facts, story shape",ph:"hook → tension → turn → exit, no new facts"},
        ],
        task: COACH + "The student rebuilt a flat post into a story shape using the same facts (Module 6). Check: did they add NO new facts (flag any they invented)? Does the rebuild now have a hook, live tension, a turn, and a clean exit? Did they trim the bloat? Compare the two for momentum.",
      },
    ],
  },
  {
    id:"m7", phase:"p3", num:7, title:"Voice, Rhythm & the Edit",
    objective:"Make sentences hit, and cut everything that doesn't.",
    blurb:"Every sentence must <b>build tension, advance cause, or pay something off</b> — if it does none, cut it, however much you like it. Vary sentence length: a short line after three long ones hits like a snare. Read everything out loud; your ear catches sag your eye glides over.",
    gotIt:"Your default draft is shorter than it used to be and reads faster out loud than in your head.",
    drills:[
      { id:"m7d1", type:"generic", title:"Rep 1 — The compression ladder",
        instructions:"Tell one story in 5 sentences, then 3, then 1. Each cut forces you to find what's load-bearing. The 1-sentence version is often your real hook in disguise.",
        fields:[
          {key:"five",kind:"area",label:"In 5 sentences",widget:"wordcount"},
          {key:"three",kind:"area",label:"In 3 sentences",widget:"wordcount"},
          {key:"one",kind:"area",label:"In 1 sentence",widget:"wordcount",ph:"the load-bearing core — maybe your real hook"},
        ],
        task: COACH + "The student compressed one story to 5, then 3, then 1 sentence (Module 7). Did each cut keep what's load-bearing and shed what isn't? Is the 1-sentence version a strong potential hook? Point out anything essential that got lost, or filler that survived the compression.",
      },
      { id:"m7d2", type:"generic", title:"Rep 2 — Read-aloud rhythm edit",
        instructions:"Paste a draft. The tool color-codes sentence length so you can <i>see</i> the rhythm — <mark class='good'>short</mark>, medium, <mark class='bad'>long</mark>. Then hit the timer and read it out loud: mark every place you stumble or get bored, and fix only those.",
        timer:true,
        fields:[ {key:"draft",kind:"area",label:"Your draft",widget:"sentences",ph:"Paste a finished draft and read it aloud…"} ],
        task: COACH + "Analyze this draft's RHYTHM and voice (Module 7). Is sentence length varied, or monotone (all long / all short)? Where would a reader stumble or get bored reading aloud? Flag run-on sentences and places a short snare-line would land harder. Suggest 2-3 specific line-level rhythm fixes. Also flag any sentence that neither builds tension, advances cause, nor pays off — those should be cut.",
      },
      { id:"m7d3", type:"generic", title:"Rep 3 — The 20% cut",
        instructions:"Paste a finished piece, then remove 20% of the words without losing meaning. It's always possible. It's always better. The counter tracks how deep you cut.",
        fields:[
          {key:"original",kind:"area",label:"Finished piece (before)",widget:"wordcount",ph:"Paste the full piece…"},
          {key:"cut",kind:"area",label:"After the cut",widget:"wordcount",ph:"Same meaning, 20% fewer words…"},
        ],
        counters:[{type:"wordDelta",from:"original",to:"cut",label:"Cut",target:20}],
        task: COACH + "The student cut 20% from a finished piece (Module 7). Did the cut preserve meaning while removing fat (hedges, adverbs, throat-clearing, redundant clauses)? Did anything load-bearing get lost? Point to 3 more specific words/phrases they could still cut. Reward tightness.",
      },
    ],
  },
  {
    id:"m8", phase:"p3", num:8, title:"The Human Insight",
    objective:"Make the reader feel something true, and feel seen.",
    blurb:"Mechanics get attention; human insight earns trust and memory. Every strong piece carries <b>one human truth</b> — a moment of being wrong, a real cost, a thing you felt that the reader has felt but never named. The deepest move: make the <b>reader the protagonist</b>, not you.",
    gotIt:"You can name the single human truth in any piece you write, and it's about the reader as much as you.",
    drills:[
      { id:"m8d1", type:"generic", title:"Rep 1 — The one human truth",
        instructions:"Pull entries where you got something wrong or paid a real price. For each, write the one human truth underneath it in a single sentence — the thing a reader would recognize <i>in themselves</i>.",
        fields:[
          {key:"m1",kind:"text",label:"Moment 1 — where you were wrong / paid a price"},
          {key:"t1",kind:"text",label:"The human truth underneath (one sentence, about the reader)"},
          {key:"m2",kind:"text",label:"Moment 2"},
          {key:"t2",kind:"text",label:"The human truth underneath"},
          {key:"m3",kind:"text",label:"Moment 3"},
          {key:"t3",kind:"text",label:"The human truth underneath"},
        ],
        task: COACH + "The student paired raw moments with the 'one human truth' underneath each (Module 8). For each truth: is it a single sentence, is it actually TRUE, and crucially is it about the READER (something they'd recognize in themselves) rather than just about the writer? Flag any that are still about the writer's win. Name the truth with the most universal recognition.",
      },
      { id:"m8d2", type:"generic", title:"Rep 2 — Make the reader the protagonist",
        instructions:"Take a piece centered on <i>your</i> win and rewrite it so the reader is the protagonist and your experience is just the lens. Notice how \"you\" and \"we\" do different work than \"I\".",
        fields:[
          {key:"win",kind:"area",label:"Your win (I-centered)",ph:"\"I grew my newsletter to 10k by…\""},
          {key:"reader",kind:"area",label:"Reader as protagonist (you / we)",ph:"Make them the hero; your story is the lens."},
        ],
        task: COACH + "The student rewrote a self-centered 'win' piece to make the reader the protagonist (Module 8). Judge: does the rewrite genuinely make the reader the hero (using 'you'/'we' to create recognition), or is it still a highlight reel with pronouns swapped? Does it make the reader feel 'that's me'? Point to the strongest line and any place it slips back into bragging.",
      },
    ],
  },
  // ---------------- PHASE 4 ----------------
  {
    id:"m9", phase:"p4", num:9, title:"Format-Specific Storytelling",
    objective:"Adapt one story to the constraints and superpowers of each format.",
    blurb:"Same atoms, different physics. LinkedIn: the \"see more\" fold is a second hook. Newsletter: longer arc, slower tension, serial payoff. Teardown: find the <b>one turn</b> and cut every technically-true detail that doesn't serve it. Carousel: each slide is a beat with its own micro-loop.",
    gotIt:"You instinctively reshape a story for its container instead of pouring the same text into every format.",
    drills:[
      { id:"m9d1", type:"generic", title:"Rep 1 — One story, three containers",
        instructions:"Take a single insight and write it as a LinkedIn post, a newsletter section, and a 6-slide carousel outline. <b>Same turn, three shapes</b> — atomization as a storytelling act, not copy-paste.",
        fields:[
          {key:"insight",kind:"text",label:"The single insight + its one turn"},
          {key:"linkedin",kind:"area",label:"(a) LinkedIn post",hint:"loop above the fold, pay below; whitespace is pacing"},
          {key:"newsletter",kind:"area",label:"(b) Newsletter section",hint:"slower build, bigger earned payoff"},
          {key:"carousel",kind:"area",label:"(c) 6-slide carousel outline",hint:"one line per slide; slide 1 = hook, last = turn/exit"},
        ],
        task: COACH + "The student wrote one insight in three formats — LinkedIn, newsletter, carousel (Module 9). Check: is it the SAME turn in all three, genuinely RESHAPED for each format's physics (LinkedIn fold, newsletter slow-burn, carousel slide-loops), or just the same text pasted three times? Flag the weakest adaptation and what the format's superpower would do differently.",
      },
      { id:"m9d2", type:"generic", title:"Rep 2 — Find the teardown's one turn",
        instructions:"Take one of your teardowns. Find its <b>single turn</b> — the decision, the failure, the non-obvious tradeoff. Cut every detail not serving it. The number of words you remove is your craft growing.",
        fields:[
          {key:"original",kind:"area",label:"The teardown (or its key section)",widget:"wordcount",ph:"Paste the analysis…"},
          {key:"turn",kind:"text",label:"The single turn it's built around"},
          {key:"trimmed",kind:"area",label:"After cutting everything that doesn't serve the turn",widget:"wordcount"},
        ],
        counters:[{type:"wordDelta",from:"original",to:"trimmed",label:"Removed in service of the turn"}],
        task: COACH + "The student reduced a teardown to its single turn (Module 9). Is the named turn genuinely the ONE turn (a decision/failure/non-obvious tradeoff), or just a topic? Does the trimmed version still build to it, or did they cut something load-bearing? What technically-true-but-irrelevant detail is still in there that should go?",
      },
    ],
  },
  {
    id:"m10", phase:"p4", num:10, title:"Format Hijacking & Signature Moves",
    objective:"Break the rules deliberately, and build a style people recognize before they see your name.",
    blurb:"<b>Format hijacking</b>: take a format the reader's brain filed as one thing and use it for another — a teardown that opens like a true-crime cold open. It works <i>because</i> you know the straight version cold. A <b>signature move</b> is the residue of choices you make consistently.",
    gotIt:"You can break your own structure on purpose for effect, and someone could identify a post as yours with the byline removed.",
    drills:[
      { id:"m10d1", type:"generic", title:"Rep 1 — Hijack a format",
        instructions:"Write your next teardown in the shape of a genre that has nothing to do with engineering — a recipe, an obituary, a court transcript, a breakup letter. <b>Keep the substance; steal the structure.</b>",
        fields:[
          {key:"format",kind:"text",label:"The borrowed format",ph:"recipe / obituary / court transcript / breakup letter…"},
          {key:"substance",kind:"text",label:"The real substance underneath",ph:"the actual technical story/topic"},
          {key:"draft",kind:"area",label:"Your piece wearing that format",ph:"Substance intact, structure hijacked…"},
        ],
        task: COACH + "The student hijacked a borrowed format onto a technical story (Module 10). Does the hijack WORK — is the substance fully intact while the borrowed structure is genuinely committed to (not just a gimmicky label)? Does the contrast create the intended effect? Point to where it's strongest and where the conceit breaks or gets dropped.",
      },
      { id:"m10d2", type:"generic", title:"Rep 2 — Make a signature move louder",
        instructions:"Audit your recent pieces for accidental signatures — a phrasing, an opening pattern, a kind of turn you reach for. Pick the best one and use it deliberately three times. Watch it become a thing people associate with you.",
        fields:[
          {key:"signature",kind:"text",label:"The accidental signature you found"},
          {key:"u1",kind:"area",label:"Deliberate use 1"},
          {key:"u2",kind:"area",label:"Deliberate use 2"},
          {key:"u3",kind:"area",label:"Deliberate use 3"},
        ],
        task: COACH + "The student identified a signature move and used it three times deliberately (Module 10). Is the signature distinctive enough to become recognizable (vs generic)? Across the three uses, is it consistent yet not formulaic/tired? Which use lands best? Advise how to make it unmistakably theirs without it becoming a tic.",
      },
    ],
  },
  {
    id:"m11", phase:"p4", num:11, title:"The Sustaining System",
    objective:"Turn storytelling from a burst into an engine that runs without you white-knuckling it.",
    blurb:"Talent isn't the constraint; <b>systems</b> are. Four loops keep it alive: the Swipe File, a weekly Teardown, <b>Analytics as feedback</b> (the drop-off IS the diagnosis), and Story Bank → Pipeline (separate capture from creation). Read the performance curve as a story critic, not a marketer.",
    gotIt:"You never face a blank page cold, and you can read a performance curve and name the craft failure behind it.",
    drills:[
      { id:"m11d1", type:"generic", title:"Rep 1 — Weekly teardown extract",
        instructions:"Your standing weekly 30-minute slot: 3 swipe-file dissections + 1 teardown of something that worked. Reverse-engineer one piece — not to copy, to extract the <b>transferable move</b>, not the topic.",
        fields:[
          {key:"piece",kind:"text",label:"The piece that worked this week"},
          {key:"move",kind:"area",label:"The transferable move (the mechanic, NOT the topic)",ph:"What structure/technique could you run on any topic?"},
        ],
        task: COACH + "The student reverse-engineered a piece that worked (Module 11). Did they extract a TRANSFERABLE MOVE (a reusable structural/voice mechanic) or just summarize the topic/content? If it's topic-level, push them to name the underlying mechanic. Confirm whether the extracted move is genuinely portable to other subjects.",
      },
      { id:"m11d2", type:"generic", title:"Rep 2 — Diagnose drop-off as a story failure",
        instructions:"After 5 posts, pull the analytics and diagnose each drop-off as a <i>story</i> failure, not a reach failure. Above the fold = <b>hook</b> problem. Loses the middle = <b>tension</b> problem. High reads, no action = <b>payoff</b> problem.",
        fields:[
          {key:"a",kind:"text",label:"Post A — where readers left + your diagnosis (hook / tension / payoff)"},
          {key:"b",kind:"text",label:"Post B — where + diagnosis"},
          {key:"c",kind:"text",label:"Post C — where + diagnosis"},
          {key:"pattern",kind:"text",label:"The most common failure across them — what you'll fix next"},
        ],
        task: COACH + "The student diagnosed drop-offs on several posts as craft failures (Module 11). For each, does their diagnosis match the drop location (above-fold→hook, middle→tension, high-reads-no-action→payoff)? Correct any mis-diagnosis. Then validate their 'most common pattern' and give one concrete craft fix to apply to the next batch.",
      },
    ],
  },
];

// ---------------- CAPSTONE: 9-step guided run (each step is a generic sub-drill) ----------------
const CAPSTONE = [
  { id:"cap1", type:"generic", title:"1. Source it",
    instructions:"Pick a company, system, or technical decision with a <b>genuine turn</b> — a failure, a non-obvious tradeoff, a decision that looks wrong until it doesn't.",
    fields:[{key:"source",kind:"area",label:"Your subject + why it has a turn"}],
    task: COACH + "Capstone step 1. Does this subject actually contain a genuine turn (a failure / non-obvious tradeoff / looks-wrong-until-it-doesn't decision), or is it just a topic? If there's no turn, say so and suggest where one might be." },
  { id:"cap2", type:"generic", title:"2. The one idea & the one turn",
    instructions:"Write both in a sentence <b>before</b> you draft (Modules 1 & 5).",
    fields:[{key:"idea",kind:"text",label:"The one idea"},{key:"turn",kind:"text",label:"The one turn"}],
    task: COACH + "Capstone step 2. Are the one idea and the one turn each crisp and distinct? Is the turn a real reframe (not a restatement of the idea)? Sharpen both into single clean sentences." },
  { id:"cap3", type:"generic", title:"3. Skeleton first",
    instructions:"One line per beat (Module 6).",
    fields:[{key:"hook",kind:"text",label:"Hook"},{key:"tension",kind:"text",label:"Tension"},{key:"turn",kind:"text",label:"Turn"},{key:"insight",kind:"text",label:"Insight"}],
    task: COACH + "Capstone step 3. Evaluate the hook → tension → turn → insight skeleton. Is the tension live, does the turn turn, does the insight generalize to the reader? Name the weakest beat." },
  { id:"cap4", type:"generic", title:"4. Write 10 hooks, pick one",
    instructions:"Write 10 hooks (Module 4); pick the one whose promise matches your turn (Module 5).",
    fields:[...Array.from({length:10},(_,i)=>({key:"h"+(i+1),kind:"text",label:"Hook "+(i+1)})),{key:"pick",kind:"text",label:"The one you picked + why its promise matches the turn"}],
    counters:[{type:"filledCount",keys:Array.from({length:10},(_,i)=>"h"+(i+1)),label:"Hooks",target:10}],
    task: COACH + "Capstone step 4. Of these hooks, which best buys the next line AND makes a promise the chosen turn can pay off? Is the student's pick the right one? Name your top choice and why." },
  { id:"cap5", type:"generic", title:"5. Draft — struggle, not trophy",
    instructions:"Draft with specificity and the struggle, not the trophy (Modules 3 & 8). Name the human truth.",
    fields:[{key:"draft",kind:"area",label:"The draft",widget:"abstract"},{key:"truth",kind:"text",label:"The one human truth (about the reader)"}],
    task: COACH + "Capstone step 5. Is the draft specific (concrete images/numbers, struggle shown not trophy displayed)? Is the human truth genuinely about the reader? Flag remaining abstraction and any place it brags instead of bleeds." },
  { id:"cap6", type:"generic", title:"6. Edit until it bleeds",
    instructions:"Read aloud, cut 20%, every sentence builds / advances / pays off (Module 7).",
    fields:[{key:"before",kind:"area",label:"Before",widget:"wordcount"},{key:"after",kind:"area",label:"After the edit",widget:"sentences"}],
    counters:[{type:"wordDelta",from:"before",to:"after",label:"Cut",target:20}],
    task: COACH + "Capstone step 6. Did the edit cut ~20% without losing meaning, vary rhythm, and ensure every sentence builds/advances/pays off? Point to any sentence that still earns its place poorly, and any further cut." },
  { id:"cap7", type:"generic", title:"7. Atomize",
    instructions:"The same turn as a LinkedIn post, a newsletter section, and a carousel — reshaped, not copied (Module 9).",
    fields:[{key:"linkedin",kind:"area",label:"LinkedIn"},{key:"newsletter",kind:"area",label:"Newsletter section"},{key:"carousel",kind:"area",label:"Carousel outline"}],
    task: COACH + "Capstone step 7. Same turn across all three formats, genuinely reshaped for each container's physics? Flag the weakest adaptation." },
  { id:"cap8", type:"generic", title:"8. Optionally hijack the format",
    instructions:"Borrow a genre's structure for effect (Module 10). Skip if it doesn't serve the piece.",
    fields:[{key:"hijack",kind:"area",label:"The hijacked version (optional)"}],
    task: COACH + "Capstone step 8 (optional). If they attempted a format hijack, does it keep the substance while committing to the borrowed structure, and does it serve the piece rather than distract? If empty, say it's fine to skip." },
  { id:"cap9", type:"generic", title:"9. Ship & read the drop-off",
    instructions:"Ship, then read the drop-off as a story critic (Module 11) and write the one thing you'd change.",
    fields:[{key:"dropoff",kind:"text",label:"Where readers dropped + your story-failure diagnosis"},{key:"change",kind:"area",label:"The one thing you'd change next time"}],
    task: COACH + "Capstone step 9. Is the drop-off diagnosed as a craft failure (hook/tension/payoff) matching where readers left? Is the 'one thing to change' the highest-leverage fix? Confirm or redirect." },
];
const moduleById = (id) => MODULES.find(m => m.id === id);

// Worked examples — the "answer key" for what good looks like. Keyed by drill id.
const EXAMPLES = {
  m1d1: `
    <p class="ex-label bad">Weak — sequence (report)</p>
    <blockquote>We launched the feature. Users signed up. We got feedback. We made changes. Growth was good.</blockquote>
    <p class="ex-label good">Strong — because-chain</p>
    <blockquote>We launched with no onboarding, <b>so</b> new users hit a blank screen and left. <b>Because</b> they left, activation cratered to 4%. <b>That number forced us</b> to watch session replays — and what we saw made us kill half the feature.</blockquote>
    <p class="ex-note">Paste the first into the highlighter and it lights up all red. The second carries you because each beat is the reason for the next.</p>`,
  m1d2: `
    <ul class="ex-spine">
      <li><b>Once there was…</b> a 3-person startup that prided itself on shipping fast.</li>
      <li><b>Every day…</b> we pushed straight to production, no staging — it felt like a superpower.</li>
      <li><b>Until one day…</b> a one-line config change took down every customer for six hours.</li>
      <li><b>Because of that…</b> we lost our two biggest accounts that week.</li>
      <li><b>Because of that…</b> we built the staging environment we'd mocked as "enterprise bloat."</li>
      <li><b>Until finally…</b> shipping got slower, but nothing broke for a year.</li>
      <li><b>And ever since…</b> I don't trust a team that brags about moving fast without a way to catch itself.</li>
    </ul>
    <p class="ex-note">The whole thing turns on one line — "until one day." Everything before is setup; everything after is consequence.</p>`,
  m2d1: `
    <p class="ex-label">Topic: a pricing mistake</p>
    <ol class="ex-lines">
      <li>We undercharged by 10x for two years and didn't notice.</li>
      <li>The most expensive word on our pricing page was "free."</li>
      <li>A customer emailed to say our prices were too low. We ignored him. He was right.</li>
      <li>I can tell you the exact day we left $400k on the table.</li>
      <li>Your pricing is wrong in the direction you're least afraid of.</li>
    </ol>
    <p class="ex-note">Read line 1 alone — you <i>need</i> line two. Compare to "Today I want to talk about pricing," which closes its own loop.</p>`,
  m2d2: `
    <blockquote>The bug sat in production for eight months before it cost us a single dollar. Then, on a Tuesday, it cost us forty thousand of them.</blockquote>
    <p class="ex-line2"><b>Opens at:</b> "before it cost us a single dollar" — the gap: why eight months? what changed?</p>
    <p class="ex-line2"><b>Closes at:</b> the final-third line revealing what that Tuesday triggered — not sentence two.</p>`,
  m3d1: `
    <p class="ex-label bad">Abstract</p>
    <blockquote>It was a really hard year. Growth was slow, the team was struggling, morale was low. But we learned a lot and came out stronger.</blockquote>
    <p class="ex-label good">Concrete</p>
    <blockquote>For seven months we added maybe two customers. I stopped opening the revenue dashboard because the number never moved. Two engineers quit the same week — one said, "I can't tell what we're building anymore." I started writing the shutdown email in my head.</blockquote>
    <p class="ex-note">The highlighter flags "hard," "growth," "struggling," "low," "learned a lot," "stronger." Each becomes an image, a number, or a quote.</p>`,
  m3d2: `
    <p class="ex-label bad">Telling</p>
    <blockquote>I was nervous before the big demo and felt unprepared.</blockquote>
    <p class="ex-label good">Showing</p>
    <blockquote>I read the first slide out loud to the bathroom mirror four times. My hands were cold. I'd written BREATHE on the back of one in pen.</blockquote>
    <p class="ex-note">No "nervous," no "unprepared" — the reader lands on those words themselves.</p>`,
  m4d1: `
    <p class="ex-label">Idea: we spent 3 weeks on a feature 0 people used</p>
    <ol class="ex-lines">
      <li>We spent three weeks building a feature. Exactly zero people have used it.</li>
      <li>The analytics dashboard taught me something I didn't want to know.</li>
      <li>I can show you the most expensive button we ever built.</li>
      <li>"Build it and they will come" is a lie I paid three weeks for.</li>
      <li>Nobody asked for the feature. I built it anyway. Here's the bill.</li>
      <li>Our most-requested feature had a usage rate of 0%.</li>
      <li>The feature was perfect. That was the problem.</li>
      <li>I learned to read analytics the week I stopped trusting my gut.</li>
      <li>We measured everything except whether anyone wanted it.</li>
      <li>Three weeks, zero users, one lesson I keep relearning.</li>
    </ol>
    <p class="ex-note">#1 is the obvious one. #6 and #7 open the sharpest loops. The good hook is rarely the first.</p>`,
  m4d2: `
    <p class="ex-label">Idea: most teams adopt microservices too early</p>
    <ul class="ex-spine">
      <li><b>Contrarian:</b> Microservices were a mistake for most teams that adopted them.</li>
      <li><b>Curiosity gap:</b> Splitting our monolith cut our deploy speed in half — in the wrong direction.</li>
      <li><b>Stakes / cost:</b> Going microservices cost us nine months and two engineers before we admitted it.</li>
      <li><b>Specificity:</b> The day we hit 31 services and 4 engineers, something had to give.</li>
      <li><b>Pattern interrupt:</b> Nobody asked, but your architecture is org-chart cosplay.</li>
    </ul>
    <p class="ex-note">Same idea, five doors in. Notice which one you reach for by default — that's your over-relied lane.</p>`,
  m5d1: `
    <p class="ex-label good">Matched (same size)</p>
    <blockquote><b>Promise:</b> "This one config change cut our latency in half."<br><b>Payoff:</b> The post shows the exact setting, why it worked, and the before/after graph.</blockquote>
    <p class="ex-label bad">Mismatched (bait)</p>
    <blockquote><b>Promise:</b> "The mistake that almost killed our company."<br><b>Payoff:</b> A minor process tweak. The hook wrote a check the body couldn't cash.</blockquote>
    <p class="ex-note">Fix the body to meet the hook — never water down the hook to match a weak body.</p>`,
  m5d2: `
    <p class="ex-label bad">Reframe stated outright</p>
    <blockquote>The lesson is that hiring senior engineers too early slows you down.</blockquote>
    <p class="ex-label good">Reframe arrived at</p>
    <blockquote>By month three, our two senior hires had written three design docs and zero shipped lines. I finally saw it: we'd hired people to operate a machine we hadn't built yet.</blockquote>
    <p class="ex-note">The reader reaches the conclusion a beat before you state it. That gap is the most satisfying moment in content.</p>`,
  m6d1: `
    <ul class="ex-spine">
      <li><b>Hook:</b> The outage didn't cost us money for eight months. Then it cost $40k in an afternoon.</li>
      <li><b>Context:</b> One feature flag, left on for a "temporary" test.</li>
      <li><b>Tension:</b> Every week it didn't break felt like proof it was safe.</li>
      <li><b>Turn:</b> The flag wasn't the bug — our confidence was.</li>
      <li><b>Resolution:</b> We now delete temporary flags on a timer, not a vibe.</li>
      <li><b>Exit:</b> The most dangerous code is the kind that's worked so far.</li>
    </ul>
    <p class="ex-note">One line per beat. If the tension line is weak, the piece collapses into a list — fix it here.</p>`,
  m6d2: `
    <p class="ex-label bad">Flat / corporate</p>
    <blockquote>We implemented a feature-flag governance process to improve reliability and reduce incidents, resulting in better outcomes for customers.</blockquote>
    <p class="ex-label good">Same facts, story shape</p>
    <blockquote>A feature flag we forgot about cost us $40k in one afternoon. So we stopped trusting ourselves to remember: every temporary flag now deletes itself on a timer. Incidents from stale flags since: zero.</blockquote>
    <p class="ex-note">Not one new fact added — only the shape changed.</p>`,
  m7d1: `
    <blockquote><b>5:</b> We left a feature flag on after a test. For months nothing happened. One afternoon it triggered a bad code path. It cost us $40k. Now we expire flags automatically.</blockquote>
    <blockquote><b>3:</b> A forgotten flag did nothing for months, then cost us $40k in an afternoon. The bug wasn't the flag — it was trusting ourselves to remember. Now flags expire on a timer.</blockquote>
    <blockquote><b>1:</b> The most dangerous code is the kind that's worked so far.</blockquote>
    <p class="ex-note">The 1-sentence version is often your real hook in disguise.</p>`,
  m7d2: `
    <blockquote>We shipped it Friday. It broke Saturday. By Sunday I'd read the same stack trace forty times and still couldn't see the one line where everything went wrong — until I read it out loud and heard the bug in my own sentence.</blockquote>
    <p class="ex-note">Short, short, then a long one that runs — the rhythm mirrors the spiral. Read yours aloud; fix only what makes you stumble.</p>`,
  m7d3: `
    <p class="ex-label bad">Before (44 words)</p>
    <blockquote>I think that one of the most important things that I've personally learned over the course of my career is that you really need to make sure that you are listening very carefully to what your customers are actually telling you.</blockquote>
    <p class="ex-label good">After (−45%, 24 words)</p>
    <blockquote>The most important thing I've learned: listen to what customers actually tell you — not what you wish they'd said.</blockquote>
    <p class="ex-note">"I think," "really," "very," "personally" — load-bearing nothing. The cut is always possible and always better.</p>`,
  m8d1: `
    <ul class="ex-spine">
      <li><b>Moment:</b> I rewrote onboarding three times before admitting the product was the problem. → <b>Truth:</b> We polish the thing we can control to avoid fixing the thing we can't.</li>
      <li><b>Moment:</b> I ignored a customer who said our price was too low. → <b>Truth:</b> We discount our own value and call it being reasonable.</li>
    </ul>
    <p class="ex-note">The truth is one sentence and it's about the reader, not you. That sentence is the soul of a future post.</p>`,
  m8d2: `
    <p class="ex-label bad">Your win (I-centered)</p>
    <blockquote>I grew my newsletter to 10k by posting consistently and finding my voice.</blockquote>
    <p class="ex-label good">Reader as protagonist</p>
    <blockquote>You don't have a consistency problem. You have a "you delete the post that sounds most like you" problem. I did it for a year before I noticed — every draft I killed was the honest one.</blockquote>
    <p class="ex-note">"You" and "we" make the reader the hero; your story becomes the lens, not the highlight reel.</p>`,
  m9d1: `
    <p class="ex-label">Insight + turn: the bug wasn't the flag, it was our confidence</p>
    <ul class="ex-spine">
      <li><b>LinkedIn:</b> Hook above the fold ("$40k in one afternoon"), the turn below "see more," whitespace as pacing.</li>
      <li><b>Newsletter:</b> Slower build — walk the eight quiet months, earn the turn, end with a principle for the reader's own stale flags.</li>
      <li><b>Carousel:</b> 1) "$40k afternoon" 2) the forgotten flag 3) months of silence 4) the trigger 5) turn: confidence was the bug 6) expire flags on a timer.</li>
    </ul>
    <p class="ex-note">Same turn, three physics. Not copy-paste — reshape.</p>`,
  m9d2: `
    <p class="ex-label">The one turn</p>
    <blockquote>They didn't scale by adding servers — they scaled by deleting the feature everyone thought was the product.</blockquote>
    <p class="ex-note">Keep every detail that builds to that. Cut the tech-stack tour, the timeline, the org chart. The words you remove are your craft growing.</p>`,
  m10d1: `
    <p class="ex-label">Format: recipe · Substance: how we killed our flagship feature</p>
    <blockquote><b>Ingredients:</b> 1 beloved feature, 4 engineers, 0 users (measured, not assumed). <b>Method:</b> 1. Let it simmer three weeks while telling yourself it's almost ready. 2. Check analytics. Recoil. 3. Remove from heat immediately…</blockquote>
    <p class="ex-note">The substance is a real teardown; the recipe structure is stolen. Works because everyone knows the straight version.</p>`,
  m10d2: `
    <p class="ex-label">Accidental signature: the "the X wasn't the bug — the Y was" turn</p>
    <ul class="ex-spine">
      <li>The flag wasn't the bug — our confidence was.</li>
      <li>The feature wasn't the problem — our fear of deleting it was.</li>
      <li>The price wasn't too high — our story about it was.</li>
    </ul>
    <p class="ex-note">Used deliberately three times, it becomes a turn people associate with you. Style is the residue of repeated choices.</p>`,
  m11d1: `
    <blockquote><b>Piece:</b> A viral post titled "I was wrong about microservices."<br><b>Transferable move (not the topic):</b> Admit a specific belief, name the exact moment it broke, then generalize to the reader — confession → turn → "you too." I can run that spine on any topic.</blockquote>
    <p class="ex-note">Extract the mechanic, never the topic. That's what compounds into pattern recognition.</p>`,
  m11d2: `
    <ul class="ex-spine">
      <li><b>Post A</b> — dropped above the fold → <b>hook problem.</b> The first line announced a topic instead of opening a loop.</li>
      <li><b>Post B</b> — lost people in the middle → <b>tension problem.</b> No live question between setup and payoff.</li>
      <li><b>Post C</b> — high reads, no action → <b>payoff problem.</b> The turn was stated, not earned.</li>
    </ul>
    <p class="ex-note">Read the curve as a story critic, not a marketer. The drop-off location IS the diagnosis.</p>`,
};

// ----------------------------------------------------------------------------
// Client-side language tools
// ----------------------------------------------------------------------------
const SEQ_CONNECTORS = ["and then","then,","then ","after that","afterwards","next,","next ","later,","later ","eventually","subsequently","following that","once that"];
const CAUSAL_CONNECTORS = ["because","so that","which meant","which is why","that's why","as a result","therefore","so i","so we","so it","forcing","which forced","leaving us","leaving me","meaning "," so they"];
const ABSTRACT_WORDS = ["hard","easy","amazing","incredible","awesome","great ","scalable","complex","complicated","growth","success","successful","failure","difficult","challenging","journey","passionate","innovative","robust","powerful","efficient","optimize","leverage","synergy","impactful","meaningful","exciting","interesting","good ","bad ","better","best","huge","massive","significant","various","several","things","stuff","really ","very ","a lot","learnings","insights","value ","game-changer","seamless","cutting-edge","world-class"];

function highlightTerms(text, terms, cls) {
  if (!text) return "<span class='muted'>(nothing to scan yet)</span>";
  // Build a case-insensitive alternation, longest first to avoid partial overlaps.
  const sorted = [...terms].sort((a,b)=>b.length-a.length).map(t => t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const re = new RegExp("(" + sorted.join("|") + ")", "gi");
  return esc(text).replace(/\n/g,"§NL§").replace(re, (m)=>`<mark class='${cls}'>${m.trim()}</mark>`).replace(/§NL§/g,"\n");
}
function highlightConnectors(text) {
  if (!text) return "<span class='muted'>(paste text above to scan connectors)</span>";
  let out = esc(text).replace(/\n/g,"§NL§");
  const seq = [...SEQ_CONNECTORS].sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const cau = [...CAUSAL_CONNECTORS].sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  out = out.replace(new RegExp("("+seq.join("|")+")","gi"), m=>`<mark class='bad'>${m}</mark>`);
  out = out.replace(new RegExp("("+cau.join("|")+")","gi"), m=>`<mark class='good'>${m}</mark>`);
  return out.replace(/§NL§/g,"\n");
}
function countMatches(text, terms) {
  if (!text) return 0;
  const sorted = [...terms].sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const re = new RegExp("("+sorted.join("|")+")","gi");
  return (text.match(re)||[]).length;
}
const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const sentenceCount = (t) => (t.trim() ? (t.match(/[^.!?]+[.!?]*/g)||[]).filter(s=>s.trim().length).length : 0);
const debounce = (fn,ms=300)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

function highlightSentences(text){
  if(!text) return "<span class='muted'>(write something to see the rhythm)</span>";
  const parts = text.match(/\s*[^.!?]+[.!?]*/g) || [text];
  return parts.map(p=>{ const w=wordCount(p); const cls = w<=8?'s-short':(w<=20?'s-med':'s-long'); return `<span class="${cls}">${esc(p)}</span>`; }).join("");
}

// Live client-side widgets rendered under a field (declared via field.widget).
function widgetHtml(kind, v){
  if(kind==='connectors'){ const seqN=countMatches(v,SEQ_CONNECTORS),cauN=countMatches(v,CAUSAL_CONNECTORS);
    return `<div class="hl-out">${highlightConnectors(v)}</div><p class="tool-note">Sequence: <b class="${seqN>cauN?'count-warn':''}">${seqN}</b> · Causal: <b class="${cauN>=seqN?'count-good':''}">${cauN}</b></p>`; }
  if(kind==='abstract'){ const n=countMatches(v,ABSTRACT_WORDS);
    return `<div class="hl-out">${highlightTerms(v,ABSTRACT_WORDS,'abstract')}</div><p class="tool-note"><b class="${n>0?'count-warn':'count-good'}">${n}</b> abstract word${n===1?'':'s'} to make concrete.</p>`; }
  if(kind==='sentences'){
    return `<div class="hl-out">${highlightSentences(v)}</div><div class="legend"><span><i style="background:rgba(74,222,128,.5)"></i> short</span><span><i style="background:rgba(154,163,178,.4)"></i> medium</span><span><i style="background:rgba(248,113,113,.5)"></i> long — vary them, don't drone</span></div>`; }
  if(kind==='wordcount'){ return `<p class="tool-note">${wordCount(v)} words · ${sentenceCount(v)} sentence${sentenceCount(v)===1?'':'s'}</p>`; }
  return "";
}
// Drill-level computed counters (declared via drill.counters).
function counterHtml(c, get){
  if(c.type==='filledCount'){ const n=c.keys.filter(k=>(get(k)||'').trim().length>2).length; const done=n>=c.target;
    return `<div class="counter ${done?'ok':''}">${c.label}: <b>${n}/${c.target}</b>${done?' ✓':''}</div>`; }
  if(c.type==='wordCount'){ return `<div class="counter">${c.label}: <b>${wordCount(get(c.key))}</b> words</div>`; }
  if(c.type==='wordDelta'){ const a=wordCount(get(c.from)), b=wordCount(get(c.to)); const removed=a-b; const pct=a?Math.round((removed/a)*100):0; const hit=removed>0&&pct>=(c.target||20);
    return `<div class="counter ${hit?'ok':''}">${c.label}: <b>${a}</b> → <b>${b}</b> (${removed>0?'−':''}${Math.abs(removed)} words, ${pct}%)${hit?' ✓':''}</div>`; }
  return "";
}

// ----------------------------------------------------------------------------
// Coach API
// ----------------------------------------------------------------------------
async function callCoach(task, input) {
  const res = await fetch("/api/coach", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ task, input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Coach request failed");
  return data;
}

function feedbackHtml(fb, raw) {
  if (!fb || (!fb.verdict && !(fb.fixes||[]).length && !(fb.strengths||[]).length)) {
    return `<div class="card feedback"><div class="fb-rewrite">${esc(raw||"No structured feedback returned.")}</div></div>`;
  }
  const score = (typeof fb.score === "number") ? Math.max(0,Math.min(100,fb.score)) : null;
  const list = (arr) => (arr&&arr.length) ? `<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : `<div class="muted">—</div>`;
  return `
    <div class="card feedback">
      ${fb.verdict ? `<p class="verdict">${esc(fb.verdict)}</p>` : ""}
      ${score!==null ? `<div class="score-bar"><i style="width:${score}%"></i></div><div class="muted" style="font-size:12px;margin-top:-8px">score ${score}/100</div>` : ""}
      <div class="fb-group"><h4>What works</h4>${list(fb.strengths)}</div>
      <div class="fb-group"><h4>Fixes</h4>${list(fb.fixes)}</div>
      ${fb.rewrite ? `<div class="fb-group"><h4>Sharper version</h4><div class="fb-rewrite">${esc(fb.rewrite)}</div></div>` : ""}
    </div>`;
}

// Wire a "Coach me" button to gather input, call the API, render + persist feedback.
function wireCoach(btn, getInput, task, outEl, drillId) {
  btn.addEventListener("click", async () => {
    const input = getInput();
    if (!input || !input.trim()) { toast("Write something first."); return; }
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Coaching… (~10s)`;
    outEl.innerHTML = `<div class="card feedback"><span class="muted">Claude is reading your work…</span></div>`;
    try {
      const data = await callCoach(task, input);
      outEl.innerHTML = feedbackHtml(data.feedback, data.raw);
      if (drillId) saveDrill(drillId, { feedback: data.feedback, raw: data.raw });
    } catch (e) {
      outEl.innerHTML = `<div class="card feedback"><p class="verdict" style="color:var(--warn)">Coaching failed</p><div class="muted">${esc(e.message)}</div><p class="tool-note">Is the server running? Coaching needs <code>node server.js</code>, not just opening the file.</p></div>`;
    } finally {
      btn.disabled = false; btn.innerHTML = original;
    }
  });
}

// ----------------------------------------------------------------------------
// Drill renderers — each returns HTML and gets a mount(root) for behavior.
// ----------------------------------------------------------------------------
function drillShell(d, inner) {
  return `<div class="card" data-drill="${d.id}">
    <span class="pill">${d.title}</span>
    <p class="lead" style="font-size:14px;margin-top:10px">${d.instructions}</p>
    ${EXAMPLES[d.id] ? `<details class="example"><summary>Show an example</summary><div class="example-body">${EXAMPLES[d.id]}</div></details>` : ""}
    ${inner}
    <div class="btn-row">
      <button class="btn coach-btn">Coach me</button>
      <span class="tool-note">Sends your work to Claude for a read.</span>
    </div>
    <div class="coach-out"></div>
  </div>`;
}

const RENDERERS = {
  becauseChain(d){
    const s = drillState(d.id);
    return drillShell(d, `
      <label class="field">Original / draft <span class="hint">— pasted to scan connectors</span></label>
      <textarea class="f-orig" placeholder="Paste a post or draft here…">${esc(s.orig||"")}</textarea>
      <div class="scan"></div>
      <div class="legend"><span><i style="background:rgba(248,113,113,.5)"></i> sequence join (report)</span><span><i style="background:rgba(74,222,128,.5)"></i> causal join (story)</span></div>
      <label class="field">Your because-chain rewrite</label>
      <textarea class="f-rewrite" placeholder="Rewrite so each beat happens BECAUSE of the one before it…">${esc(s.rewrite||"")}</textarea>
    `);
  },
  spine(d){
    const s = drillState(d.id);
    const rows = [
      ["once","Once there was…"],["everyday","Every day…"],["untilone","Until one day…  (the ONE disruption)"],
      ["bc1","Because of that…"],["bc2","Because of that…"],["finally","Until finally…"],["since","And ever since…"],
    ];
    return drillShell(d, rows.map(([k,label],i)=>`
      <label class="field">${label}</label>
      <input type="text" class="small spine-f" data-k="${k}" placeholder="${k==='untilone'?'the turn — what broke the pattern?':'…'}" value="${esc(s[k]||"")}">
    `).join(""));
  },
  fiveLines(d){
    const s = drillState(d.id);
    let html = "";
    for (let i=1;i<=5;i++){
      html += `<label class="field">First line ${i}</label>
      <input type="text" class="line-f" data-i="${i}" placeholder="A line that's useless on its own…" value="${esc(s["l"+i]||"")}">`;
    }
    return drillShell(d, html + `<p class="tool-note" style="margin-top:12px">Test each: read just the line. Do you <i>need</i> the next one?</p>`);
  },
  loop(d){
    const s = drillState(d.id);
    return drillShell(d, `
      <label class="field">Your opening (plant the loop)</label>
      <textarea class="f-open" placeholder="Open a gap you won't close until the final third…">${esc(s.open||"")}</textarea>
      <label class="field">Where do you OPEN the loop? <span class="hint">(quote the line)</span></label>
      <input type="text" class="small f-openline" value="${esc(s.openline||"")}" placeholder="The line that creates the gap…">
      <label class="field">Where do you CLOSE it? <span class="hint">(quote the line — should be late)</span></label>
      <input type="text" class="small f-closeline" value="${esc(s.closeline||"")}" placeholder="The line that pays it off…">
    `);
  },
  abstraction(d){
    const s = drillState(d.id);
    return drillShell(d, `
      <label class="field">Paste a post <span class="hint">— scans for abstract words</span></label>
      <textarea class="f-orig" placeholder="Paste a post…">${esc(s.orig||"")}</textarea>
      <div class="scan"></div>
      <label class="field">Concrete rewrite <span class="hint">— swap each vague word for an image, number, or moment</span></label>
      <textarea class="f-rewrite" placeholder="Make the reader SEE it…">${esc(s.rewrite||"")}</textarea>
    `);
  },
  showTell(d){
    const s = drillState(d.id);
    return drillShell(d, `
      <label class="field">TELLING version <span class="hint">— summary, conclusions, adjectives</span></label>
      <textarea class="f-tell" placeholder="It was a hard year and I learned a lot…">${esc(s.tell||"")}</textarea>
      <label class="field">SHOWING version <span class="hint">— one scene, no adjectives, let the reader conclude</span></label>
      <textarea class="f-show" placeholder="I ate the same instant noodles for four months…">${esc(s.show||"")}</textarea>
    `);
  },
  // Declarative renderer: drives most drills from a `fields` spec (+ optional widgets, counters, timer).
  generic(d){
    const s = drillState(d.id);
    let inner = (d.fields||[]).map(f=>{
      const val = esc(s[f.key]||"");
      const lab = `<label class="field">${f.label}${f.hint?` <span class="hint">— ${f.hint}</span>`:''}</label>`;
      const w = f.widget ? `<div class="scan" data-for="${f.key}"></div>` : "";
      if (f.kind==="area") return `${lab}<textarea class="gen-f" data-k="${f.key}" placeholder="${esc(f.ph||'')}">${val}</textarea>${w}`;
      return `${lab}<input type="text" class="small gen-f" data-k="${f.key}" placeholder="${esc(f.ph||'')}" value="${val}">${w}`;
    }).join("");
    if (d.timer) inner += `<div class="readtimer"><button class="btn ghost sm rt-btn" type="button">▶ Start read-aloud</button> <span class="rt-disp timer">0:00</span></div>`;
    if (d.counters) inner += `<div class="counters"></div>`;
    if (d.note) inner += `<p class="tool-note" style="margin-top:12px">${d.note}</p>`;
    return drillShell(d, inner);
  },
};

// Behavior wiring per drill type after the HTML is in the DOM.
function mountDrill(d, root){
  const card = root.querySelector(`[data-drill="${d.id}"]`);
  const out = card.querySelector(".coach-out");
  const btn = card.querySelector(".coach-btn");
  // restore last feedback
  const st = drillState(d.id);
  if (st.feedback || st.raw) out.innerHTML = feedbackHtml(st.feedback, st.raw);

  const save = (obj) => saveDrill(d.id, obj);

  if (d.type==="generic"){ mountGeneric(d, card, out, btn); return; }
  if (d.type==="becauseChain" || d.type==="abstraction"){
    const orig = card.querySelector(".f-orig");
    const rewrite = card.querySelector(".f-rewrite");
    const scan = card.querySelector(".scan");
    const renderScan = () => {
      if (d.type==="becauseChain"){
        const seqN = countMatches(orig.value, SEQ_CONNECTORS), cauN = countMatches(orig.value, CAUSAL_CONNECTORS);
        scan.innerHTML = `<div class="hl-out">${highlightConnectors(orig.value)}</div>
          <p class="tool-note">Sequence joins: <b class="${seqN>cauN?'count-warn':''}">${seqN}</b> · Causal joins: <b class="${cauN>=seqN?'count-good':''}">${cauN}</b>${seqN>cauN?" — this reads as a report. Add because.":""}</p>`;
      } else {
        const n = countMatches(orig.value, ABSTRACT_WORDS);
        scan.innerHTML = `<div class="hl-out">${highlightTerms(orig.value, ABSTRACT_WORDS,'abstract')}</div>
          <p class="tool-note"><b class="${n>0?'count-warn':'count-good'}">${n}</b> abstract word${n===1?'':'s'} to make concrete.</p>`;
      }
    };
    renderScan();
    orig.addEventListener("input", debounce(()=>{ renderScan(); save({orig:orig.value}); }));
    rewrite.addEventListener("input", debounce(()=>save({rewrite:rewrite.value})));
    wireCoach(btn, ()=> `${d.type==='becauseChain'?'ORIGINAL':'ORIGINAL'}:\n${orig.value}\n\nREWRITE:\n${rewrite.value}`, d.task, out, d.id);
  }
  else if (d.type==="spine"){
    const fields = [...card.querySelectorAll(".spine-f")];
    fields.forEach(f=>f.addEventListener("input", debounce(()=>{ const o={}; fields.forEach(x=>o[x.dataset.k]=x.value); save(o); })));
    wireCoach(btn, ()=> fields.map(f=>`${f.previousElementSibling.textContent.trim()} ${f.value}`).join("\n"), d.task, out, d.id);
  }
  else if (d.type==="fiveLines"){
    const fields = [...card.querySelectorAll(".line-f")];
    fields.forEach(f=>f.addEventListener("input", debounce(()=>{ const o={}; fields.forEach(x=>o["l"+x.dataset.i]=x.value); save(o); })));
    wireCoach(btn, ()=> fields.map((f,i)=>`${i+1}. ${f.value}`).filter(x=>x.length>3).join("\n"), d.task, out, d.id);
  }
  else if (d.type==="loop"){
    const open=card.querySelector(".f-open"), ol=card.querySelector(".f-openline"), cl=card.querySelector(".f-closeline");
    [["open",open],["openline",ol],["closeline",cl]].forEach(([k,el])=>el.addEventListener("input",debounce(()=>save({[k]:el.value}))));
    wireCoach(btn, ()=>`OPENING:\n${open.value}\n\nSTUDENT SAYS LOOP OPENS AT: ${ol.value}\nSTUDENT SAYS LOOP CLOSES AT: ${cl.value}`, d.task, out, d.id);
  }
  else if (d.type==="showTell"){
    const tell=card.querySelector(".f-tell"), show=card.querySelector(".f-show");
    tell.addEventListener("input",debounce(()=>save({tell:tell.value})));
    show.addEventListener("input",debounce(()=>save({show:show.value})));
    wireCoach(btn, ()=>`TELLING VERSION:\n${tell.value}\n\nSHOWING VERSION:\n${show.value}`, d.task, out, d.id);
  }
}

// Behavior for any type:"generic" drill — fields, live widgets, counters, optional timer.
function mountGeneric(d, card, out, btn){
  const fields = [...card.querySelectorAll(".gen-f")];
  const get = (k) => { const el = card.querySelector(`.gen-f[data-k="${k}"]`); return el ? el.value : ""; };
  const save = () => { const o={}; fields.forEach(x=>o[x.dataset.k]=x.value); saveDrill(d.id, o); };
  const widgets = (d.fields||[]).filter(f=>f.widget);
  const render = () => {
    widgets.forEach(f=>{ const el=card.querySelector(`.scan[data-for="${f.key}"]`); if(el) el.innerHTML = widgetHtml(f.widget, get(f.key)); });
    if (d.counters){ const box=card.querySelector(".counters"); if(box) box.innerHTML = d.counters.map(c=>counterHtml(c,get)).join(""); }
  };
  fields.forEach(f=>f.addEventListener("input", debounce(()=>{ save(); render(); })));
  render();
  if (d.timer) wireTimer(card);
  wireCoach(btn, ()=> (d.fields||[]).map(f=>`${f.label}:\n${get(f.key)}`).join("\n\n"), d.task, out, d.id);
}

// Read-aloud stopwatch for Module 7 Rep 2.
function wireTimer(card){
  const btn=card.querySelector(".rt-btn"), disp=card.querySelector(".rt-disp");
  let t=null, sec=0;
  btn.addEventListener("click", ()=>{
    if (t){ clearInterval(t); t=null; btn.textContent="▶ Resume"; return; }
    btn.textContent="⏸ Pause";
    t=setInterval(()=>{ sec++; disp.textContent = Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0"); }, 1000);
  });
}

// ----------------------------------------------------------------------------
// Views
// ----------------------------------------------------------------------------
function renderSidebar(active){
  const prog = getProgress();
  let html = `<div class="brand">Storytelling Practice<small>reps over theory</small></div>`;
  html += `<a class="nav-item ${active==='dash'?'active':''}" href="#/"><span class="dot"></span> Dashboard</a>`;
  html += `<div class="nav-section">Always-on tools</div>`;
  html += `<a class="nav-item ${active==='swipe'?'active':''}" href="#/swipe"><span class="dot"></span> Swipe File</a>`;
  html += `<a class="nav-item ${active==='bank'?'active':''}" href="#/bank"><span class="dot"></span> Story Bank</a>`;
  let curPhase = null;
  MODULES.forEach(m=>{
    if (m.phase!==curPhase){ curPhase=m.phase; const ph=PHASES.find(p=>p.id===m.phase); html += `<div class="nav-section">${esc(ph.name)}</div>`; }
    const done = prog[m.id]?.gotIt;
    const lock = m.locked ? "🔒 " : "";
    html += `<a class="nav-item ${active===m.id?'active':''} ${done?'done':''}" href="#/module/${m.id}"><span class="nav-num">M${m.num}</span><span class="dot"></span> ${lock}${esc(m.title)}</a>`;
  });
  html += `<div class="nav-section">Capstone</div>`;
  html += `<a class="nav-item ${active==='cap'?'active':''}" href="#/capstone"><span class="nav-num">★</span><span class="dot"></span> Narrative Teardown</a>`;
  document.getElementById("sidebar").innerHTML = html;
}

function renderDashboard(){
  const prog = getProgress();
  const swipeN = DB.get(SWIPE,[]).length, bankN = DB.get(BANK,[]).length;
  let html = `<div class="eyebrow">The content storytelling curriculum</div>
    <h1>Practice, don't read.</h1>
    <p class="lead">Every module ends in reps. If you didn't do the reps, the module didn't happen. Pick a module and start writing — Claude reads each rep and coaches you.</p>
    <div class="card tight">
      <b>The one discipline that beats every technique:</b> before any piece, finish — “This piece exists to make the reader feel/realize ___.” If you can't, no hook will save it.
    </div>
    <h2>Start here — the two always-on artifacts</h2>
    <div class="mod-grid">
      <a class="mod-card" href="#/swipe"><div class="mc-top"><span class="mc-num">TOOL</span><span class="progress-chip">${swipeN} saved</span></div><div class="mc-title">Swipe File</div><div class="mc-obj">Save content that stopped your scroll and dissect its mechanics — hook, loop, turn, what was cut.</div></a>
      <a class="mod-card" href="#/bank"><div class="mc-top"><span class="mc-num">TOOL</span><span class="progress-chip">${bankN} captured</span></div><div class="mc-title">Story Bank</div><div class="mc-obj">Dump raw material — a thing you got wrong, a surprising number, a small humiliation. Don't shape it. Capture it.</div></a>
    </div>`;

  PHASES.forEach(ph=>{
    const mods = MODULES.filter(m=>m.phase===ph.id);
    html += `<div class="phase-block"><div class="phase-head"><h3>${esc(ph.name)}</h3><span class="muted">— ${esc(ph.tag)}</span></div><div class="mod-grid">`;
    mods.forEach(m=>{
      const done = prog[m.id]?.gotIt;
      if (m.locked){
        html += `<div class="mod-card locked"><div class="mc-top"><span class="mc-num">M${m.num}</span><span class="progress-chip">next slice</span></div><div class="mc-title">${esc(m.title)}</div><div class="mc-obj">${esc(m.objective)}</div></div>`;
      } else {
        html += `<a class="mod-card" href="#/module/${m.id}"><div class="mc-top"><span class="mc-num">M${m.num}</span><span class="progress-chip">${m.drills.length} reps ${done?'<span class="check">✓ got it</span>':''}</span></div><div class="mc-title">${esc(m.title)}</div><div class="mc-obj">${esc(m.objective)}</div></a>`;
      }
    });
    html += `</div></div>`;
  });
  html += `<div class="phase-block"><div class="phase-head"><h3>Capstone</h3><span class="muted">— run everything at once</span></div><div class="mod-grid">
      <a class="mod-card" href="#/capstone"><div class="mc-top"><span class="mc-num">★</span><span class="progress-chip">9 steps</span></div><div class="mc-title">The Narrative Teardown</div><div class="mc-obj">Source a real piece with a genuine turn and run it through every module — idea, skeleton, 10 hooks, draft, edit, atomize, ship.</div></a>
    </div></div>`;
  document.getElementById("view").innerHTML = html;
}

function renderModule(id){
  const m = moduleById(id);
  if (!m || m.locked){ location.hash = "#/"; return; }
  const ph = PHASES.find(p=>p.id===m.phase);
  const gotIt = getProgress()[m.id]?.gotIt;
  let html = `<div class="eyebrow">${esc(ph.name)} · Module ${m.num}</div>
    <h1>${esc(m.title)}</h1>
    <p class="lead">${esc(m.objective)}</p>
    <div class="card tight">${m.blurb}</div>
    <h2>Reps</h2>`;
  html += `<div id="drills"></div>`;
  html += `<div class="gotit">
      <input type="checkbox" id="gotit" ${gotIt?'checked':''}>
      <div class="label"><b>You've got it when:</b> ${esc(m.gotIt)}</div>
    </div>`;
  document.getElementById("view").innerHTML = html;

  const drillsRoot = document.getElementById("drills");
  drillsRoot.innerHTML = m.drills.map(d=>RENDERERS[d.type](d)).join("");
  m.drills.forEach(d=>mountDrill(d, drillsRoot));

  document.getElementById("gotit").addEventListener("change",(e)=>{ setGotIt(m.id, e.target.checked); renderSidebar(m.id); toast(e.target.checked?"Marked — got it.":"Unmarked."); });
}

function renderCapstone(){
  let html = `<div class="eyebrow">Capstone</div>
    <h1>The Narrative Teardown, End to End</h1>
    <p class="lead">Run everything at once on one real piece. Each step has its own coach. Do this monthly and the curriculum stops being a document and becomes how you work.</p>
    <div class="card tight">In one breath: open a loop, hold it, pay it off with one earned turn. Be specific, show the struggle, cut everything else. Make the reader the protagonist.</div>
    <div id="cap"></div>`;
  document.getElementById("view").innerHTML = html;
  const root = document.getElementById("cap");
  root.innerHTML = CAPSTONE.map(d=>RENDERERS.generic(d)).join("");
  CAPSTONE.forEach(d=>mountDrill(d, root));
}

// ---- Swipe File ----
function renderSwipe(){
  const items = DB.get(SWIPE,[]);
  let html = `<div class="eyebrow">Always-on tool</div><h1>Swipe File</h1>
    <p class="lead">Every time a post, email, or video stops your scroll, save it and dissect the <i>mechanics</i> — not the topic. You're stealing structures, not lines. Target: 3–5 a week.</p>
    <details class="example"><summary>Show an example dissection</summary><div class="example-body">
      <ul class="ex-spine">
        <li><b>Title:</b> "I was completely wrong about microservices"</li>
        <li><b>Source:</b> LinkedIn</li>
        <li><b>Hook:</b> the admission of being wrong → opens "wrong how?"</li>
        <li><b>Loop:</b> what did they believe, and what flipped it?</li>
        <li><b>Turn:</b> the real cost wasn't technical — it was the team's cognitive load.</li>
        <li><b>Cut:</b> no architecture diagrams, no "it depends," no list of 12 tradeoffs — just the one that mattered.</li>
      </ul>
    </div></details>
    <div class="card">
      <label class="field">What stopped your scroll? <span class="hint">title / one-liner</span></label>
      <input type="text" id="s-title" placeholder="e.g. 'I was completely wrong about microservices'">
      <label class="field">Source <span class="hint">platform / author</span></label>
      <input type="text" id="s-source" placeholder="e.g. LinkedIn — @someone">
      <label class="field">Link <span class="hint">optional</span></label>
      <input type="text" id="s-url" placeholder="https://…">
      <label class="field">The hook — what made stopping involuntary?</label>
      <textarea id="s-hook"></textarea>
      <label class="field">The loop it opened — the question/gap that pulled you</label>
      <textarea id="s-loop"></textarea>
      <label class="field">The turn — where's the reframe / “oh”?</label>
      <textarea id="s-turn"></textarea>
      <label class="field">What did it cut? — what would a worse writer have left in?</label>
      <textarea id="s-cut"></textarea>
      <div class="btn-row"><button class="btn" id="s-save">Save dissection</button></div>
    </div>
    <h2>Your file <span class="muted" style="font-size:14px">(${items.length})</span></h2>
    <div id="s-list"></div>`;
  document.getElementById("view").innerHTML = html;

  const renderList = () => {
    const arr = DB.get(SWIPE,[]);
    const el = document.getElementById("s-list");
    if (!arr.length){ el.innerHTML = `<div class="empty">Nothing yet. Next time something stops your scroll — save it here within the minute.</div>`; return; }
    el.innerHTML = arr.map(it=>`<div class="entry">
      <div class="meta"><span class="tag">${esc(it.source||'?')}</span><span>${esc(it.createdAt)}</span><span class="x" data-id="${it.id}">✕ delete</span></div>
      <div class="body"><b>${esc(it.title||'(untitled)')}</b>${it.url?` · <a href="${esc(it.url)}" target="_blank" rel="noreferrer">link</a>`:''}
      ${it.hook?`<br><span class="muted">Hook:</span> ${esc(it.hook)}`:''}
      ${it.loop?`<br><span class="muted">Loop:</span> ${esc(it.loop)}`:''}
      ${it.turn?`<br><span class="muted">Turn:</span> ${esc(it.turn)}`:''}
      ${it.cut?`<br><span class="muted">Cut:</span> ${esc(it.cut)}`:''}</div>
    </div>`).join("");
    el.querySelectorAll(".x").forEach(x=>x.addEventListener("click",()=>{
      DB.set(SWIPE, DB.get(SWIPE,[]).filter(i=>i.id!==x.dataset.id)); renderList(); renderSidebar('swipe');
    }));
  };
  renderList();
  document.getElementById("s-save").addEventListener("click",()=>{
    const g = (id)=>document.getElementById(id).value.trim();
    if (!g("s-title") && !g("s-hook")){ toast("Add at least a title or a hook."); return; }
    const arr = DB.get(SWIPE,[]);
    arr.unshift({ id:uid(), title:g("s-title"), source:g("s-source"), url:g("s-url"), hook:g("s-hook"), loop:g("s-loop"), turn:g("s-turn"), cut:g("s-cut"), createdAt:nowStr() });
    DB.set(SWIPE, arr);
    ["s-title","s-source","s-url","s-hook","s-loop","s-turn","s-cut"].forEach(id=>document.getElementById(id).value="");
    renderList(); toast("Saved to swipe file."); document.querySelector('h2').scrollIntoView({behavior:'smooth'});
  });
}

// ---- Story Bank ----
function renderBank(){
  let html = `<div class="eyebrow">Always-on tool</div><h1>Story Bank</h1>
    <p class="lead">Raw material, unshaped. A moment you got something wrong, a number that surprised you, a thing a user said, a small humiliation, an argument you lost. Most “I have nothing to write about” is “I didn't capture anything.”</p>
    <details class="example"><summary>Show example captures</summary><div class="example-body">
      <ul class="ex-spine">
        <li>"Customer said 'I didn't realize I could do that' about the main feature." — <span class="tag">got-it-wrong</span></li>
        <li>"Spent 3 weeks on a feature. Checked analytics — 0 users." — <span class="tag">surprising-number</span></li>
        <li>"Investor asked what our moat was and I went blank." — <span class="tag">small-humiliation</span></li>
      </ul>
      <p class="ex-note">Don't polish these — capture is separate from creation. Shape them later.</p>
    </div></details>
    <div class="card">
      <label class="field">Capture it — don't shape it</label>
      <textarea id="b-text" placeholder="Just the raw moment. One or two lines is fine."></textarea>
      <label class="field">Tag <span class="hint">optional</span></label>
      <input type="text" id="b-tag" class="small" placeholder="e.g. got-it-wrong / surprising-number / user-said">
      <div class="btn-row"><button class="btn" id="b-save">Capture</button></div>
    </div>
    <h2>Raw material <span class="muted" style="font-size:14px" id="b-count"></span></h2>
    <div id="b-list"></div>`;
  document.getElementById("view").innerHTML = html;

  const renderList = () => {
    const arr = DB.get(BANK,[]);
    document.getElementById("b-count").textContent = `(${arr.length})`;
    const el = document.getElementById("b-list");
    if (!arr.length){ el.innerHTML = `<div class="empty">Empty soil. Drop one raw moment from this week — you'll grow a post from it later.</div>`; return; }
    el.innerHTML = arr.map(it=>`<div class="entry">
      <div class="meta">${it.tag?`<span class="tag">${esc(it.tag)}</span>`:''}<span>${esc(it.createdAt)}</span><span class="x" data-id="${it.id}">✕</span></div>
      <div class="body">${esc(it.text)}</div></div>`).join("");
    el.querySelectorAll(".x").forEach(x=>x.addEventListener("click",()=>{ DB.set(BANK, DB.get(BANK,[]).filter(i=>i.id!==x.dataset.id)); renderList(); renderSidebar('bank'); }));
  };
  renderList();
  document.getElementById("b-save").addEventListener("click",()=>{
    const text = document.getElementById("b-text").value.trim();
    if (!text){ toast("Capture something first."); return; }
    const arr = DB.get(BANK,[]);
    arr.unshift({ id:uid(), text, tag:document.getElementById("b-tag").value.trim(), createdAt:nowStr() });
    DB.set(BANK, arr);
    document.getElementById("b-text").value=""; document.getElementById("b-tag").value="";
    renderList(); toast("Captured.");
  });
}

// ----------------------------------------------------------------------------
// Router + toast
// ----------------------------------------------------------------------------
function toast(msg){
  const t = document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2200);
}
function route(){
  const hash = location.hash || "#/";
  window.scrollTo(0,0);
  if (hash.startsWith("#/module/")){ const id=hash.split("/")[2]; renderSidebar(id); renderModule(id); }
  else if (hash==="#/capstone"){ renderSidebar('cap'); renderCapstone(); }
  else if (hash==="#/swipe"){ renderSidebar('swipe'); renderSwipe(); }
  else if (hash==="#/bank"){ renderSidebar('bank'); renderBank(); }
  else { renderSidebar('dash'); renderDashboard(); }
}
window.addEventListener("hashchange", route);
route();
