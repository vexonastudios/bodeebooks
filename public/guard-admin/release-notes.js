'use strict';

(function releaseNotesModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BODEE_RELEASE_NOTES = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReleaseNotesApi() {
  const RELEASES = Object.freeze([
    Object.freeze({"version":"1.2.305","released_on":"2026-10-10","title":"Less background activity, responsive family controls","parent":{"headline":"Your dashboard rests when you do","summary":"BodeeGuard uses fewer background requests while keeping your family controls and message notifications available.","highlights":["Routine dashboard checks stop after three minutes without interaction and refresh when you return.","Child computers reuse unchanged settings and send smaller school updates.","Media and game requests do less repeated work; failed diagnostic uploads retry more gently."]},"child":{"headline":"Quieter syncing in the background","summary":"BodeeGuard keeps your settings and school reports up to date with less background work.","highlights":["School reports use less data when they sync.","Your parent’s settings and lock commands still apply.","Your saved work, messages and media progress stay in place."]}}),
    Object.freeze({"version":"1.2.304","released_on":"2026-10-10","title":"Find Bible topics in everyday words","parent":{"headline":"Bible Topics understands more familiar words","summary":"Children can find topics using everyday words and phrases across the full Bible topic index.","highlights":["Sad, unhappy and feeling sad now find Sorrow; getting left out finds Rejection.","Expanded vocabulary covers all 5,684 topic headings, including familiar alternatives for older terms.","Exact topic names still rank first, and the improved search works offline."]},"child":{"headline":"Search the Bible in your own words","summary":"Try everyday words in Bible Topics to find verses about what is on your mind.","highlights":["Try sad, worried or getting left out in the Topics search box.","You can also type a phrase such as I am feeling really sad.","Open a passage to read more, bookmark it or add it to your memory verses."]}}),
    Object.freeze({"version":"1.2.303","released_on":"2026-10-09","title":"Your Bible, your colors","parent":{"headline":"A comfortable Bible for every child","summary":"Children can choose their own theme colors or a simple white Bible.","highlights":["Bible reading, Topics, plans and memory practice now follow the child’s selected theme.","Theme colors and Plain white buttons are easy to reach at the top of the Bible.","Each child’s Bible appearance is remembered on that computer without changing their dashboard theme.","Verse highlights stay readable, and the verse editor is centered."]},"child":{"headline":"Choose how your Bible looks","summary":"Use your favorite theme or enjoy a simple white page.","highlights":["Choose Theme colors or Plain white at the top of your Bible.","Your choice is remembered for you on this computer, even after reopening the app.","Switch back anytime. Your notes, highlights and memory verses stay saved."]}}),
    Object.freeze({"version":"1.2.302","released_on":"2026-10-09","title":"Explore the Bible by topic","parent":{"headline":"Help children find Scripture by topic","summary":"The Bible now includes an offline Topics index with passages from the Berean Standard Bible.","highlights":["Explore twelve starting topics or search more than 5,600 historical topic headings.","Read passages in context, bookmark a verse or add it to Scripture memory.","Topic search works offline and keeps each child’s existing Bible notes and memory collection."]},"child":{"headline":"Find Bible verses about your questions","summary":"Open Bible, then Topics, to explore Scripture about courage, friendship, prayer and more.","highlights":["Choose a topic card, search in your own words or browse A–Z.","Open any passage in its chapter to read more.","Save a verse with Bookmark or Memorize to practice it later."]}}),
    Object.freeze({"version":"1.2.301","released_on":"2026-10-09","title":"Clear game time and quicker parent controls","parent":{"headline":"See play time and add time in one place","summary":"Family Games now appears in Used today, with a quick room shortcut and extra-time controls on each child card.","highlights":["See today’s recorded Family Games play, including the elapsed part of a running game.","Open Family Game Room from the dashboard and add 15, 30 or 60 minutes for one child.","Children can send you a private request for 30 more game minutes when time runs out.","Children can dismiss the earlier-lesson warning without deleting reports or stopping sync."]},"child":{"headline":"Clearer game time and room to work","summary":"See when game time is finished and ask your parent for more.","highlights":["Use Ask for 30 more minutes to send your parent a private message. Your parent still decides.","Close the earlier-lesson warning with its X when it covers your work.","The warning stays clear of your White Noise controls."]}}),
    Object.freeze({"version":"1.2.300","released_on":"2026-10-09","title":"A clearer Family Games library","parent":{"headline":"A polished game library for your family","summary":"Distinct game titles and a cleaner child game room make it easier to browse and play.","highlights":["Each game has a readable title styled to match its artwork.","Children can switch between Video games and Board games, with game time visible at the top.","Consistent cards and clear play buttons fit large and small screens.","Existing permissions, game-time limits, verified downloads and update controls remain in place."]},"child":{"headline":"Find your next game","summary":"Your game room has a new layout with bigger titles and easier controls.","highlights":["Choose Video games or Board games at the top.","See your remaining game time while choosing what to play.","Use Download & play or Play on each game card, and open its preview for more details."]}}),
    Object.freeze({"version":"1.2.299","released_on":"2026-10-09","title":"Critter County Hunting and update recovery","parent":{"headline":"A new Family Game","summary":"Critter County Hunting is available with the existing Family Games permissions and time limits.","highlights":["Download and update Critter County Hunting through BodeeGuard, with verified files from its official release.","Play solo or join family on the same home network using matching game versions.","Review three screenshots and game details before allowing it.","Update recovery now remembers a retry request during the waiting period and avoids repeating a stale staging failure."]},"child":{"headline":"Explore Critter County","summary":"Find Critter County Hunting in Family Games when your parent allows games and you have time available.","highlights":["Download the game, play solo, or join family on the same home network.","BodeeGuard handles game updates and brings you back when game time ends.","If an app update needs recovery, your retry request waits and continues automatically."]}}),
    Object.freeze({"version":"1.2.298","released_on":"2026-10-08","title":"Bible reading and Scripture memory","parent":{"headline":"Read, remember and grow together","summary":"Children have an always-available offline Bible, with reading plans and organized Scripture memory.","highlights":["Read the full Berean Standard Bible with highlights, bookmarks, personal notes and whole-Bible search.","Use the Horner plan or shorter reading plans, and practice verses with hints, word hiding and typing from memory.","Assign passages to several children together and see their memory progress.","Choose optional Bible backup for each child; it stays off until you enable it.","Chapter audio controls are ready for the audiobook files, which will be added later."]},"child":{"headline":"Your Bible and memory verses","summary":"Open Bible to read, save favorite verses and practice Scripture at your own pace.","highlights":["Read the Berean Standard Bible even when you are offline.","Highlight verses, add notes and bookmarks, or find a verse with Search.","Follow a reading plan and keep your place.","Organize memory verses and practice with hints, hidden words or typing from memory.","Your parent can send you passages to practice. Audio chapters are coming later."]}}),
    Object.freeze({"version":"1.2.297","released_on":"2026-10-07","title":"School progress and faster family controls","parent":{"headline":"Clearer school checks and easier family tools","summary":"See why Earn Coins is waiting, check Abeka activities more accurately, and manage children with fewer steps.","highlights":["Abeka Activities now distinguishes a current lesson from an upcoming one; Earn Coins names school tasks still waiting for confirmation.","Parents can choose a daily Earn Coins opening time, such as 11:45 a.m., while allowing children through as soon as school is finished.","Preview a child’s assigned dashboard safely, update a profile photo from the student card, and delete a student with confirmation.","Review a child’s screenshot bug report and send it to support; unlock requested music, videos and audiobooks directly from a message.","Assign Long Division as its own daily activity while keeping it in Math Coach. Daily Verse and Brain Teaser have more questions."]},"child":{"headline":"See what is next and get help faster","summary":"Your school progress and Earn Coins checklist are clearer, and you can report a problem from your menu.","highlights":["Earn Coins shows which required school tasks still need confirmation and checks again when the opening time arrives.","Abeka Activities handles tomorrow’s lesson separately from work due today.","Use Report a bug to send a screenshot and a short explanation to your parent for review.","Practice Long Division from its own assigned activity when your parent adds it.","Daily Verse and Brain Teaser have more questions to explore."]}}),
    Object.freeze({"version":"1.2.296","released_on":"2026-10-06","title":"Child-controlled message sounds","parent":{"headline":"Children can mute message sounds","summary":"Each child can turn message chimes off or on without missing family conversations.","highlights":["A bell button in Messages and the quick conversation controls the alert sound.","Muted messages still arrive and remain visible in their conversations.","The sound choice stays with each child across app restarts."]},"child":{"headline":"Choose when Messages makes a sound","summary":"Use the bell in Messages or the quick chat to turn message chimes off or on.","highlights":["Your messages keep arriving and stay visible when sounds are muted.","The bell shows whether message sounds are on or off.","Your choice is remembered on this computer, even after BodeeGuard restarts."]}}),
    Object.freeze({"version":"1.2.295","released_on":"2026-10-06","title":"Keep Send clear in child Messages","parent":{"headline":"White Noise no longer covers Send","summary":"White Noise controls move into the Messages header so children can reach the full composer.","highlights":["Private, family and group chats keep Send reachable, including on smaller or scaled screens.","White Noise keeps playing while the controls move between Messages and the dashboard.","Children can pause, resume or choose White Noise directly from the Messages header."]},"child":{"headline":"Send messages while White Noise plays","summary":"Your sound buttons now sit at the top of Messages, leaving room to type and send.","highlights":["Send to Mom & Dad, Family or your groups without buttons covering your reply.","Use the sound buttons at the top to pause, play or choose a sound.","Returning to Dashboard keeps your sound playing and puts its buttons back in their usual corner."]}}),
    Object.freeze({"version":"1.2.294","released_on":"2026-10-06","title":"Clearer school progress and child conversations","parent":{"headline":"Abeka time follows the video, with clearer progress checks","summary":"Abeka time requires advancing video, confirmed daily lessons stay checked when the next lesson appears, and child Messages has a clearer conversation layout.","highlights":["Paused or stalled Abeka video no longer keeps counting from mouse or keyboard activity. The dashboard shows when lessons were last verified.","Optional noon school check-ins distinguish low recorded activity, offline computers and tracking that needs checking. Enable them in notification settings.","Child Messages has a searchable conversation list, a larger chat history and a compact composer. Parent bug reports accept reviewed photos of the child’s screen."]},"child":{"headline":"Clearer chats and school time","summary":"Find your family conversations more easily, and see school time that follows your Abeka video.","highlights":["Find Mom & Dad, Family and groups in the conversation list, with more room to read and reply.","Your Abeka timer pauses with the video. Press Play when you are ready to keep learning.","A confirmed finished lesson stays checked when Abeka shows the next lesson. Your paused lessons still stay open when you visit Dashboard or Grades."]}}),
    Object.freeze({"version":"1.2.293","released_on":"2026-10-06","title":"Keep your Abeka lesson while checking Grades","parent":{"headline":"Grades no longer restarts the open video","summary":"Abeka Grades & To-Do opens separately while the current lesson remains paused in place.","highlights":["Video Lessons returns to the same player, watched range and unfinished answers without reloading or autoplay.","Dashboard and breaks preserve the selected school page; hidden pages cannot play, count school time or request fullscreen.","If Grades crashes, children can return to the intact lesson. Parent locks, child changes and explicit reopening still close both pages."]},"child":{"headline":"Check Grades and keep your place","summary":"You can check your Abeka grades without starting your video over.","highlights":["Choose Video Lessons to return to your paused lesson, then press Play when you are ready.","Your lesson position and unfinished answers stay open while you check Grades or visit Dashboard.","If Grades stops responding, Video Lessons can still return to your open lesson."]}}),
    Object.freeze({"version":"1.2.292","released_on":"2026-10-06","title":"Responsive school controls and scheduled restarts","parent":{"headline":"Keep paused schoolwork safe and responsive","summary":"The paused-school close prompt stays inside BodeeGuard, and the thirty-minute restart choice now schedules a warned restart.","highlights":["Keep school paused and Escape cancel the close prompt without reloading the lesson or losing unfinished answers.","A slow or failed close request leaves the dashboard responsive. Changed school sessions dismiss outdated confirmations.","Restart in 30 minutes schedules the restart; open schoolwork and drafts still delay it until they are safe."]},"child":{"headline":"Come back to your paused lesson","summary":"Choose Keep school paused when you want to return to your video or unfinished answers.","highlights":["The school close prompt has responsive Keep school paused and Close school page buttons. Escape cancels it.","A slow or failed close request will not leave you trapped behind the prompt.","Restart in 30 minutes now schedules a restart with a warning. Save your work and end school when you are ready."]}}),
    Object.freeze({"version":"1.2.291","released_on":"2026-10-05","title":"Clearer conversations and fairer Earn Coins rounds","parent":{"headline":"Conversation history, accurate progress and fair practice","summary":"Child quick chat keeps the conversation visible, and Earn Coins avoids repeating earning questions within a round.","highlights":["Open child quick chats show conversation history and replies without repeated popups.","Completed school rings now fill the whole circle. Windows notification Reply in app opens and focuses the message composer.","Writing has visible Trash, Restore and Delete forever controls. Earn Coins excludes reserved questions and uses other enabled subjects when a mixed pool is short."]},"child":{"headline":"Keep chatting and earn coins with fresh questions","summary":"Your corner chat stays open with messages and replies together.","highlights":["Read earlier messages and reply in the correct family, group or parent chat.","Earn Coins avoids repeating earning questions. A missed question can return as a marked correction.","Move notes to Trash, restore them, or confirm Delete forever and Empty Trash."]}}),
    Object.freeze({"version":"1.2.290","released_on":"2026-10-05","title":"Spelling practice without a perfect-score gate","parent":{"headline":"Finish a spelling pass, then review the misses","summary":"Children can try every word once and finish daily Practice even when some answers are wrong.","highlights":["After a miss, compare the highlighted letters and choose Next word without being forced to retype it.","Missed words lead the next practice, with help at the child’s current level and no extra AI call.","Copied words and mistakes do not earn mastery. Ordinary practice has no separate coin reward or deduction; pre-test rules stay the same."]},"child":{"headline":"Try each word, then keep going","summary":"You do not need every answer right to finish your daily Spelling practice.","highlights":["If you miss a word, look at the highlighted letters and choose Next word.","Words you missed come first the next time you practice.","Keep practicing to remember words without hints. Your practice pre-test still works the same way."]}}),
    Object.freeze({"version":"1.2.289","released_on":"2026-10-05","title":"Keep your place during a school break","parent":{"headline":"Dashboard keeps the paused school page open","summary":"Children can pause a lesson, visit Dashboard or Music, then resume the same school page without restarting the player.","highlights":["Resume school returns to the existing paused lesson and unfinished answers.","Hidden lessons stay paused and do not add school time; Abeka playback restrictions remain in place.","End session warns before closing the paused page. Parent locks and school access rules still apply."]},"child":{"headline":"Return to your paused lesson","summary":"Taking a Dashboard or Music break keeps your school page open.","highlights":["Choose Resume school or your school card to return to the same page.","Your lesson stays paused until you press Play.","Use End session only when you are ready to close the school page."]}}),
    Object.freeze({"version":"1.2.288","released_on":"2026-10-05","title":"Abeka progress survives clock differences","parent":{"headline":"Abeka lesson results can keep syncing","summary":"Abeka lesson reporting handles a computer clock that is slightly behind, and older rejected reports no longer block fresh results.","highlights":["Abeka lesson checks use the signed school connection's time when Windows is behind.","Rejected earlier reports stay saved safely while newer lesson results can reach your dashboard.","Provider completion checks and parent access rules keep their existing meaning."]},"child":{"headline":"Your Abeka lesson checks can keep syncing","summary":"A small computer clock difference should no longer stop your Abeka lesson results from reaching your parent.","highlights":["Fresh lesson checks can sync even when your computer's clock is a little behind.","Earlier reports stay saved safely while you keep studying.","Completed lessons are still checked from Abeka's own lesson page."]}}),
    Object.freeze({"version":"1.2.287","released_on":"2026-10-04","title":"A compact student wallet","parent":{"headline":"Clearer wallet controls with less clutter","summary":"Store and Earn coins share a compact row, History sits beside the wallet title, and extra earned time appears as small music/video badges.","highlights":["Lucide icons and the child's theme make wallet actions easier to recognize.","Wallet controls fit narrow screens and display scaling; touch buttons stay easy to tap.","Extra earned minutes now appear correctly, and empty bonus-time rows stay hidden."]},"child":{"headline":"Earn, spend and check your coins","summary":"Your wallet has clearer buttons and takes up less room on your desk.","highlights":["Use the cart to open the Store or choose Earn coins to practice.","The History icon beside My Wallet shows where your coins went.","Small music and video badges show your extra earned minutes."]}}),
    Object.freeze({"version":"1.2.286","released_on":"2026-10-04","title":"Student update recovery and backup downloads","parent":{"headline":"Recovery paths for Windows updates","summary":"Recoverable Windows update failures get bounded automatic retries and a child-accessible recovery action, with verified backup downloads and retained recovery copies.","highlights":["Transient installer failures retry after a cooldown while schoolwork stays open until restart is safe.","Children can use Updates → Recover update to download fresh verified bytes without a parent password.","Healthy-startup failures keep the previous app and wait for a newer verified release; failure reports remain available to support."]},"child":{"headline":"Help finishing an interrupted update","summary":"Updates on your dashboard shows what is happening and helps you recover an interrupted installation.","highlights":["Some update failures retry automatically while your previous app and work are kept.","Use Recover update when offered to download a fresh verified copy.","Open schoolwork and drafts keep a restart waiting until it is safe."]}}),
    Object.freeze({"version":"1.2.285","released_on":"2026-10-04","title":"Automatic update failure reporting","parent":{"headline":"Better diagnostics for failed Windows updates","summary":"Update failures are saved and retried automatically, with computer attribution in support reports. An accumulated maintenance-helper count no longer prevents setup.","highlights":["Protected diagnostic history keeps earlier failures when another installation is attempted.","Authenticated reports show the reporting computer, versions, error stage and time without collecting private content.","A verified repair clears a stale update block; failed or unverified installer artifacts remain protected."]},"child":{"headline":"More dependable updates and help when they fail","summary":"BodeeGuard saves update failure details for support and sends them when the connection returns.","highlights":["Your work and protected recovery copies remain safe during update checks.","After a verified repair, the updater checks again instead of keeping an old failure message.","Support gets the fixed error stage and Windows code without collecting your answers or messages."]}}),
    Object.freeze({"version":"1.2.284","released_on":"2026-10-03","title":"Your day and clear coin history","parent":{"headline":"Clear next steps and visible coin rewards","summary":"The child dashboard shows required schoolwork and chores beside the planner, explains reward access, and provides a history of saved coin changes.","highlights":["Your day shows what is finished, what needs attention and why rewards are locked.","Children can open My Wallet → History for earnings, purchases, refunds and deductions with dates and amounts.","Typing explains when practice earns no coins, and Store confirmations explain how extra time follows family rules.","The parent Economy guide explains challenge and poem rewards. The ready-made chore library and suggested routine times remain available."]},"child":{"headline":"See what is next and where your coins went","summary":"Your day helps you find the next required task. Your wallet now has a history you can open anytime you are connected.","highlights":["See schoolwork and chores beside My planner, with clear reward lock reasons.","Open My Wallet → History to see why coins were earned, spent, refunded or deducted.","Typing results explain your coin reward, and the Store explains what bought time unlocks."]}}),
    Object.freeze({"version":"1.2.283","released_on":"2026-10-02","title":"Fresh Learning challenges and streak rewards","parent":{"headline":"More practice variety and visible streaks","summary":"Learning challenges now review current and past spelling lists, rotate a larger grade-level question pool, and reward consecutive correct answers within your coin cap.","highlights":["A child sees a Skip option after eight seconds when a question is too hard; skipped questions pay no coins.","Correct-answer streaks increase coin rewards and gradually stretch Math, Spelling and Vocabulary practice.","The child and parent views show streak records and credited bonuses."]},"child":{"headline":"Keep your streak going and earn more coins","summary":"Practice with more questions from your grade and your own spelling lists, including older lists. Correct answers in a row can earn more coins.","highlights":["The Skip button appears after eight seconds if you get stuck.","A streak makes some new questions harder after three and six correct answers in a subject.","See your best streak and coins earned; hints, mistakes and skips break a streak without taking coins away."]}}),
    Object.freeze({"version":"1.2.282","released_on":"2026-10-01","title":"Learning challenges and flexible game time","parent":{"headline":"Earn coins through grade-level practice","summary":"Optional Learning challenges give children short Math, Spelling and Vocabulary rounds with parent-set coin rewards and daily limits. Game-time controls also save the intended limit and let parents grant a one-day bonus.","highlights":["Turn on Learning challenges in Economy and adjust subjects, grades, rewards and caps for each child.","A child can finish 10 or 20 questions, get help, retry missed skills and see coins credited without duplicate awards.","Add 15, 30 or 60 game minutes for a child, or confirm an assistant request to grant time to all children."]},"child":{"headline":"Practice to earn coins","summary":"When your parent enables Learning challenges, choose Math, Spelling, Vocabulary or a mix and answer 10 or 20 questions for coins.","highlights":["Questions use your grade and your active spelling or vocabulary lists when available.","Hints and corrections help you learn; a wrong answer does not take coins away.","Your progress can resume later the same day, and earned coins appear in your wallet."]}}),
    Object.freeze({"version":"1.2.281","released_on":"2026-10-01","title":"Installer recovery and reliable parent Close","parent":{"headline":"A safer install retry for affected child computers","summary":"A fresh installer can continue even when protected recovery copies from earlier attempts have accumulated. The parent Close control now gives clear feedback when a child computer is offline.","highlights":["Retained recovery copies remain protected; an old-attempt count alone no longer blocks setup.","A connected child checks for parent Close and Sleep requests at least once a minute, even if a live notification is missed.","The parent dashboard distinguishes a saved Close request from confirmation that the child app actually closed."]},"child":{"headline":"BodeeGuard setup and remote controls are more dependable","summary":"Setup can continue past old recovery attempts when there is enough disk space, and remote parent requests are checked more frequently.","highlights":["Keep old recovery copies intact during a setup retry.","The app checks for parent Close and Sleep requests even if a notification does not arrive.","Setup messages no longer show a prior successful startup for a failed new attempt."]}}),
    Object.freeze({"version":"1.2.280","released_on":"2026-10-01","title":"Family conversations and clearer controls","parent":{"headline":"Faster family messages and poem photo scanning","summary":"Family and group messages save as one confirmed post, support reactions and show attached images inline. The Poems editor can scan photos for parent review before assignment.","highlights":["The Art & Coloring Studio Quick Unlock appears as one choice, and mobile time controls remain visible.","The parent Messages workspace uses more desktop space while retaining phone layout.","Installer failures now identify the protected step more clearly for support; a child computer still needs a real installation check."]},"child":{"headline":"Family chat and chores are easier to use","summary":"Shared conversations support quick reactions and inline pictures. My Chores has clearer controls across child themes.","highlights":["Send and read family messages with fewer pauses and see images in the conversation.","React to shared messages without typing a reply.","Open and close My Chores with a clear, readable button."]}}),
    Object.freeze({"version":"1.2.279","released_on":"2026-10-01","title":"Typing School keeps going","parent":{"headline":"Typing lessons now continue beyond home row","summary":"Children who finished the original ten lessons move into upper-row, lower-row, and number-row lessons. When the guided course is complete, Typing School opens Speed Test first.","highlights":["Existing home-row mastery is retained, and the next lesson appears automatically.","A separate optional numpad course teaches the physical numeric keypad on keyboards that have one.","Speed Test remains available throughout the course and opens by default after graduation."]},"child":{"headline":"Your next typing lesson is ready","summary":"After the home row, learn the rest of the keyboard. Finish the guided course and Speed Test opens first.","highlights":["Your completed home-row lessons stay complete.","Try the optional numpad lessons if your keyboard has a separate number pad.","Beat your own Speed Test score whenever you want."]}}),
    Object.freeze({"version":"1.2.278","released_on":"2026-10-01","title":"Science Spelling Lab retired","parent":{"headline":"Science Spelling Lab is removed","summary":"The separate Science Spelling activity no longer appears on child dashboards, in Activity Library, or in Daily Plan. Regular Spelling remains available.","highlights":["Existing science word lists remain in Spelling for practice.","Previous Science Spelling results remain available from Spelling as a CSV export.","Saved legacy Science Spelling assignments are retained as history but no longer sent to children."]},"child":{"headline":"One Spelling place","summary":"Science Spelling Lab is gone from your dashboard. Use Spelling for assigned words, including science terms.","highlights":["Your regular Spelling activity still works.","Old Science Spelling cards no longer take up space.","Your earlier science-word practice stays saved."]}}),
    Object.freeze({"version":"1.2.277","released_on":"2026-10-01","title":"Windows sound controls in BodeeGuard","parent":{"headline":"Children can adjust Windows speaker volume","summary":"Devices & Sound now shows the computer's actual Windows playback level and mute state, separate from lesson and media-player volume.","highlights":["Open Devices & Sound from the child dashboard or school toolbar and choose Sound.","Adjust Windows speaker or headset volume, mute or unmute, and play a test tone.","The lesson-volume slider remains separate and is labeled clearly."]},"child":{"headline":"Turn up your computer's sound","summary":"If a lesson or video is still quiet, open Devices & Sound and choose Sound to adjust Windows volume.","highlights":["Move Computer volume to make the computer louder or quieter.","Use Mute or Unmute and Test sound to check your speakers or headset.","Your lesson and music volume controls still work separately."]}}),
    Object.freeze({"version":"1.2.276","released_on":"2026-10-01","title":"Keep more videos in the selected channel","parent":{"headline":"Load more stays in the chosen video channel","summary":"The child Videos page now keeps each approved channel separate while loading additional videos.","highlights":["Load 12 More fetches the next page from the selected channel.","Channels with similar or identical display names keep separate video lists.","Channel hide and order controls continue to target the correct collection."]},"child":{"headline":"More videos from the channel you chose","summary":"Loading more videos keeps you in the same channel, even when another channel has a similar name.","highlights":["Load 12 More adds videos to the channel you are browsing.","Other channels keep their own videos and place.","Your saved channel order and hidden channels still work."]}}),
    Object.freeze({"version":"1.2.275","released_on":"2026-10-01","title":"Spelling guidance and school recovery","parent":{"headline":"Review spelling hints from each page scan","summary":"A spelling scan suggests a short clue and letter pattern for each confident word, with parent review before assigning.","highlights":["Review, change or clear each teaching hint in the parent Spelling editor.","Children hear approved Spelling words with the configured shared ElevenLabs voice when available.","School access retries after a temporary connection or protection problem without asking for a parent password."]},"child":{"headline":"Spelling help and school access recovery","summary":"Practice can show a helpful spelling clue after a missed word, and school access can recover after a temporary problem.","highlights":["Hear the word and example during Spelling when narration is available.","See a saved teaching hint after a missed practice answer; the pre-test stays hint-free.","Refresh can retry school access, and archived Videos can be restored to watch again."]}}),
    Object.freeze({"version":"1.2.274","released_on":"2026-09-30","title":"School access recovery and clearer child activities","parent":{"headline":"School pages recover after a rules refresh","summary":"The child app retries signed school rules locally and keeps existing work open if approval cannot be confirmed.","highlights":["School openings wait for a pending rules update and retry saved rules, even without internet.","A failed opening keeps the current school page and other activities available for retry.","Children can move their own My Papers items to Trash; spelling, chores and coin feedback are clearer."]},"child":{"headline":"Keep your place when school rules change","summary":"BodeeGuard checks updated school rules before opening a page and explains what to do if it still cannot open.","highlights":["A temporary rules update retries automatically instead of stopping at an error.","If school cannot open, your current page stays open and Refresh offers another try.","You can Trash your own papers and hear a quiet alert for new parent messages."]}}),
    Object.freeze({"version":"1.2.273","released_on":"2026-09-30","title":"Return to Grades after an Abeka quiz","parent":{"headline":"Completed assignments return to Abeka Grades","summary":"Recognizes both Start Another Assignment and Start another session on LinkIt’s completed-session screen.","highlights":["Returns to Abeka Grades inside BodeeGuard without repeating the quiz submission.","Unfinished quizzes and Submit or Review controls keep their normal behavior.","Includes optional child module hide/restore controls and compact message reactions."]},"child":{"headline":"Go back to Grades after your quiz","summary":"The completed-quiz button returns you to your Abeka Grades page.","highlights":["Start Another Assignment and Start another session both return after completion.","You can hide optional modules and restore them from Hidden modules.","Message reactions use compact badges and a floating emoji picker."]}}),
    Object.freeze({"version":"1.2.272","released_on":"2026-09-29","title":"Playback speed in Videos and Audiobooks","parent":{"headline":"Children can change playback speed in Videos and Audiobooks","summary":"The child player now offers the same speed controls in Videos and Audiobooks.","highlights":["Choose 1×, 1.25×, 1.5×, 1.75× or 2× in either player.","Each child's Video and Audiobook speed choices are saved separately.","The chosen speed is applied again when the next video or audiobook starts."]},"child":{"headline":"Choose your video or audiobook speed","summary":"Use the speed buttons in Videos or Audiobooks to listen or watch at your pace.","highlights":["Tap + to speed up or − to slow down, from 1× to 2×.","Your Video and Audiobook choices are remembered separately.","The speed stays set when you start another item."]}}),
    Object.freeze({"version":"1.2.271","released_on":"2026-09-29","title":"Save unlocks while a child computer is offline","parent":{"headline":"Unlock activities while a child computer sleeps","summary":"Quick Unlock, media access, extra time and computer locks can be saved for an offline child.","highlights":["Use Quick Unlock or media controls even when the child's computer is asleep or disconnected.","Saved changes reach the child when BodeeGuard reconnects; the child sees an unlock notice.","Screenshots, Close BodeeGuard and Sleep computer still require a live connection."]},"child":{"headline":"See your parent's unlock when you reconnect","summary":"BodeeGuard shows an unlock notice after your computer wakes and receives a saved parent grant.","highlights":["Quick Unlock subjects and media access sync when the child app reconnects.","The unlock notice appears once per grant on that school day.","Your normal family rules and parent locks still apply."]}}),
    Object.freeze({"version":"1.2.270","released_on":"2026-09-29","title":"Optional missed-chore coin deductions","parent":{"headline":"Choose a coin deduction for missed chore check-ins","summary":"Each chore can optionally deduct coins when it is not checked off by its deadline.","highlights":["Missed-check-in deductions default to zero and require a due time.","A charge happens once after the deadline, never exceeds the child's available balance, and does not create coin debt.","Refund a charge if the chore was done but not checked off; excusing a chore also waives or refunds its charge.","Submitted chores waiting for approval are not treated as missed check-ins."]},"child":{"headline":"Check off chores by their deadline","summary":"Your chore list shows when a missed check-in can cost coins, if your parent chooses that rule.","highlights":["The possible deduction is shown with the chore before it is due.","Checking off a chore before its deadline avoids the missed-check-in deduction, even while waiting for parent approval.","Your parent can refund a deduction when you completed a chore but forgot to check it off."]}}),
    Object.freeze({"version":"1.2.269","released_on":"2026-09-29","title":"Optional chores and routines","parent":{"headline":"Choose when chores come before rewards","summary":"Turn on Chores & Routines during Family Setup or later in Settings, then assign responsibilities to each child.","highlights":["Existing families stay off until a parent chooses to use chores.","Set one-time or repeating chores, times, coins and whether parent approval is required.","Choose whether an unfinished chore pauses videos, games, music or audiobooks starting at its scheduled time or deadline.","Schoolwork and family messages stay available. Older child computers need this update before they can enforce chore rules."]},"child":{"headline":"See your chores and earn coins","summary":"When your family uses chores, see what is due and mark it done from BodeeGuard.","highlights":["See today's chores, upcoming chores and completed work.","A parent may need to approve a chore before coins or paused rewards become available.","Schoolwork and messages stay available while a chore is waiting."]}}),
    Object.freeze({"version":"1.2.268","released_on":"2026-09-29","title":"Audiobooks while studying in Quizlet","parent":{"headline":"Listen to audiobooks during Quizlet","summary":"An allowed pinned audiobook can keep playing while a child studies in Quizlet.","highlights":["Start an audiobook, choose Pin to Bottom, then open Quizlet Study.","The player moves to the top during Quizlet so its Next button remains accessible.","Parent permissions and audiobook listening limits continue to apply."]},"child":{"headline":"Keep listening while you use Quizlet","summary":"Your allowed audiobook or music can continue while you answer Quizlet questions.","highlights":["Pin the player before opening Quizlet.","The player moves away from the Next button and returns to the bottom afterward.","Your parent’s listening rules still apply."]}}),
    Object.freeze({"version":"1.2.267","released_on":"2026-09-29","title":"Keep typing after sending a message","parent":{"headline":"Send another message without clicking the box","summary":"After Enter or Send confirms a message, the cursor returns to that conversation’s message field.","highlights":["Type several messages in a row from the parent dashboard.","The child Messages composer behaves the same way.","Switching conversations or clicking another control during a send keeps your new focus."]},"child":{"headline":"Keep chatting without clicking again","summary":"After a message sends, the typing cursor is ready for your next message.","highlights":["Press Enter or choose Send, then keep typing.","Messages and drafts still wait for their normal confirmation.","You can keep typing in the same chat without choosing the box again."]}}),
    Object.freeze({"version":"1.2.266","released_on":"2026-09-29","title":"React to family messages with emojis","parent":{"headline":"A quick reaction can be your reply","summary":"Use React beneath a message to send a thumbs up, laugh, heart or another quick response.","highlights":["Reactions are available in the parent dashboard and child Messages.","Choose a different emoji to change your reaction, or tap your current reaction to remove it.","Voice messages keep playing and unsent replies stay in place when reactions update.","Includes the shared message player styling and the existing spelling completion repairs."]},"child":{"headline":"Reply with a thumbs up or a smile","summary":"Use React in Messages when an emoji says what you mean.","highlights":["Choose thumbs up, laughing, love, celebrate, surprised or sad.","Change your reaction whenever you want; tap it again to remove it.","You can react to text, voice messages and attachments."]}}),
    Object.freeze({"version":"1.2.265","released_on":"2026-09-28","title":"Put a child computer to sleep remotely","parent":{"headline":"Put a child computer to sleep from your phone","summary":"Adds Sleep computer beside Close BodeeGuard on each child card in the parent dashboard.","highlights":["Expand a child card to find Sleep computer beside Close BodeeGuard.","Connected computers with child app 1.2.265 or newer can receive sleep requests.","BodeeGuard and open work remain ready when Windows wakes.","Unreceived requests expire in two minutes, and waking does not replay a previous request."]},"child":{"headline":"Your parent can put this computer to sleep","summary":"Your parent can use the dashboard to put this computer to sleep when it is time to stop for the day.","highlights":["Parent requests use the same Windows sleep action as your Sleep button.","BodeeGuard stays open while this computer sleeps.","Waking does not repeat a previous parent sleep request."]}}),
    Object.freeze({"version":"1.2.264","released_on":"2026-09-28","title":"School progress keeps syncing","parent":{"headline":"An older time record will not hold up new work","summary":"Keeps approved school time and completion reports syncing when an older saved record needs review.","highlights":["Valid records receive their own upload receipts instead of waiting behind a rejected record.","Original rejected records remain encrypted on the computer for review.","School permissions and completion requirements still apply.","Updates continue to wait during school and open activities."]},"child":{"headline":"Keep your school progress moving","summary":"New schoolwork can sync while an earlier time record waits for review.","highlights":["Your saved school records stay on this computer.","A connection retry does not count the same work twice.","Updates still wait while you are studying."]}}),
    Object.freeze({"version":"1.2.263","released_on":"2026-09-28","title":"Abeka lesson numbers and completion","parent":{"headline":"See the Abeka lesson each child is on","summary":"Tracks the earlier numbered lesson when Abeka shows multiple lesson days and displays that lesson beside each course.","highlights":["Future unchecked lessons no longer erase a completed earlier lesson in My Lessons Today.","Each course keeps its own lesson number, including courses working at a different pace.","Dashboard and school review show labels such as English 7 · Lesson 20.","All parts of the current lesson must finish. Parent completion decisions remain authoritative."]},"child":{"headline":"Your current Abeka lessons count","summary":"Completed lessons are recognized when Abeka also shows upcoming lessons.","highlights":["Your current lesson checks stay separate from future lessons.","Finish every part of your current lesson to complete that course.","Updates still wait during school and open activities."]}}),
    Object.freeze({"version":"1.2.262","released_on":"2026-09-28","title":"School links and family plans","parent":{"headline":"School plans apply to the intended activities","summary":"Corrects imported Quizlet and Science Spelling plan matching and improves Abeka assessment navigation.","highlights":["Quizlet follows its own saved family choice instead of inheriting Abeka requirements.","Science Spelling no longer inherits the regular Spelling requirement. Refresh Daily Plan and apply your default once to correct previously applied plans.","Abeka can use the documented LinkIt student entry, and blocked links keep the current approved school page open.","Quiz submissions are never automatically replayed. The 1.2.261 installer recovery fixes remain included."]},"child":{"headline":"Keep your school page open","summary":"School links work more reliably while keeping your current page in place.","highlights":["Abeka assessments can return through the LinkIt student entry.","A blocked outside link keeps your current school page open.","Updates still wait during school and open activities."]}}),
    Object.freeze({"version":"1.2.261","released_on":"2026-09-28","title":"More reliable update recovery","parent":{"headline":"Updates recover from temporary Windows file locks","summary":"Improves installation and recovery when Windows is still releasing application files.","highlights":["The installer waits for computer protection to finish closing before replacing files.","Temporary file locks during rollback retry automatically while keeping the verified previous app.","A healthy reopened app can clear the update screen after a delayed protection connection.","Updates continue to wait during school and open activities; restart choices remain available."]},"child":{"headline":"Getting back after an update","summary":"BodeeGuard handles delayed reopening and temporary Windows file locks more reliably.","highlights":["Keep working while a downloaded update waits.","Choose Restart now or Later when your activities are closed.","The update screen clears once your desk and computer protection are ready."]}}),
    Object.freeze({"version":"1.2.260","released_on":"2026-09-28","title":"Music while studying in Quizlet","parent":{"headline":"Keep music playing during Quizlet","summary":"Permitted pinned Music stays open when your child opens Quizlet Study.","highlights":["Start a song, Pin to Bottom, then open Quizlet.","Parent music permissions, daily listening limits and volume caps still apply.","Quizlet records its own study time while music listening keeps its existing usage counter.","Updates continue to wait during school and open activities."]},"child":{"headline":"Listen while you study in Quizlet","summary":"Keep an allowed song playing while you use Quizlet.","highlights":["Start your song in Music and choose Pin to Bottom.","Open Quizlet Study; your song keeps its place.","Use the pinned controls to pause or Stop & close music.","Your normal music time limits still apply."]}}),
    Object.freeze({"version":"1.2.259","released_on":"2026-09-28","title":"Abeka volume controls work in full screen","parent":{"headline":"Lesson volume stays where your child sets it","summary":"Abeka native volume and mute controls remain responsive in normal and full-screen lessons.","highlights":["Player redraws, speed changes and breaks no longer restore an old volume.","The BodeeGuard toolbar still adjusts volume, including nested lesson players.","Updates continue to wait while school or another activity is open."]},"child":{"headline":"Choose your lesson volume","summary":"Use the lesson player to turn sound up, down or mute it.","highlights":["Volume works in normal and full-screen lessons.","Your sound choice stays in place while the player updates.","You can also adjust sound from the school toolbar."]}}),
    Object.freeze({"version":"1.2.258","released_on":"2026-09-28","title":"Updates wait for school","parent":{"headline":"Choose when the child app restarts","summary":"Downloaded updates wait during school and open activities. Children can restart when ready or postpone.","highlights":["Restart now and Later (30 minutes) are available on the ready-update notice.","Automatic restart requires ten minutes on an unused dashboard, followed by a sixty-second warning.","School, writing, drafts and other open activities keep the update waiting.","The installer retries brief Windows file contention and reports specific Windows error codes to staff.","Includes automatic computer-protection reconnection from version 1.2.256."]},"child":{"headline":"Keep working while an update waits","summary":"Choose when to restart BodeeGuard from the update notice on your dashboard.","highlights":["Keep school and other activities open while the update waits.","Choose Later to wait at least thirty more minutes.","Restart now is available when your activities are closed and your work is saved.","Using the computer cancels an automatic restart countdown."]}}),
    Object.freeze({"version":"1.2.257","released_on":"2026-09-28","title":"School time sync recovers cleanly","parent":{"headline":"Clearer school time and fewer confusing warnings","summary":"Fixes a timestamp error that could leave a school-time warning visible over Abeka even while the approved school page worked.","highlights":["New study intervals never begin before the signed parent approval timestamp.","Older intervals affected by this timing bug are repaired after an explicit server rejection; exact originals stay encrypted on the child computer.","Only authorized time is uploaded. Other permission checks and saved work remain in place.","Recovered sync warnings disappear automatically, and staff diagnostics identify persistent checkpoint failures.","Logic Coach vocabulary stays readable on light and dark themes."]},"child":{"headline":"Keep working while your school time syncs","summary":"School time saves more reliably and recovered connection warnings disappear.","highlights":["Your saved work and school login stay on this computer.","You can continue using your parent-approved school page.","The connection warning disappears when your school time syncs again."]}}),
    Object.freeze({"version":"1.2.256","released_on":"2026-09-28","title":"Computer protection reconnects automatically","parent":{"headline":"Routine protection recovery no longer needs a parent restart","summary":"BodeeGuard retries its local protection helper automatically, then restores activities and lets a waiting update proceed when work is saved.","highlights":["A missed protection heartbeat or helper exit triggers automatic reconnection without a parent password.","Clock corrections and delayed heartbeat reads no longer cause false protection failures.","Open writing and art drafts remain in place while access is paused.","Updates still verify protection and saved work before restarting; persistent faults keep retrying and appear in staff diagnostics."]},"child":{"headline":"BodeeGuard reconnects itself","summary":"If computer protection loses its connection, keep BodeeGuard open while it reconnects.","highlights":["Activities return automatically once protection is confirmed.","Your saved work stays on this computer.","A downloaded update can restart automatically when your work is saved and activities are closed."]}}),
    Object.freeze({"version":"1.2.255","released_on":"2026-09-27","title":"Easier touchscreen learning","parent":{"headline":"Larger controls and better tablet layouts","summary":"Touch controls, portrait layouts and typing input are improved throughout the child app.","highlights":["Common child controls have larger tap targets on touch and hybrid devices.","Logic questions and music playlists offer up/down buttons for reordering.","Typing exercises accept touch keyboard text and count active practice time.","Piano supports simultaneous touches and a scrollable keyboard in portrait.","Art Studio protects an active stroke from other fingers and adds Hand to move zoomed paper."]},"child":{"headline":"Tap, type, play and draw","summary":"Your activities are easier to use on a touchscreen.","highlights":["Use the arrow buttons to arrange Logic steps and playlist songs.","Tap the typing input to use your touch keyboard.","Swipe across the piano to reach more keys.","Choose Hand in Art Studio to move around zoomed paper without drawing."]}}),
    Object.freeze({"version":"1.2.254","released_on":"2026-09-27","title":"Voice messages keep the child app in place","parent":{"headline":"Listen and reply inside BodeeGuard","summary":"Voice playback and message pop-up activation now restore the protected full-screen layer without taking focus away from the message controls.","highlights":["Restores the child app above the Windows shell when a message pop-up is activated or audio starts.","Keeps Play/Pause and the reply field usable while the message window stays compact.","Parent locks, authorized exit and approved external games retain their existing behavior."]},"child":{"headline":"Listen to your parent without leaving your work","summary":"Message playback keeps your BodeeGuard windows in place.","highlights":["Play your parent's voice message inside BodeeGuard.","The message controls and reply box keep working while you listen.","Your saved schoolwork and activities stay in place."]}}),
    Object.freeze({"version":"1.2.253","released_on":"2026-09-27","title":"Math Coach follows each child's settings","parent":{"headline":"Only enabled children see Math Coach","summary":"The child dashboard now checks the saved Math Coach setting for that child before showing its card.","highlights":["Disabled Math Coach stays off both assigned activities and extra shortcuts.","Enabled children who need approval for today see a clear locked card.","Changes refresh on the next sync; another child's or an outdated snapshot cannot expose Math Coach."]},"child":{"headline":"Your activities match your plan","summary":"Math Coach appears when your parent has enabled it for you.","highlights":["Your dashboard hides Math Coach when it is not enabled.","If you need approval for today, the card explains what to ask your parent.","Your other activities and saved progress stay in place."]}}),
    Object.freeze({"version":"1.2.252","released_on":"2026-09-27","title":"Clearer help when pairing cannot finish","parent":{"headline":"Know what is installed and what needs attention","summary":"Connection help explains when an incorrect Windows clock makes a new pairing code appear expired.","highlights":["Confirms BodeeGuard is already installed when setup needs a clock correction.","Explains the ten-minute pairing code and gives the exact date/time and Retry pairing steps.","Fixes garbled apostrophes throughout connection help and keeps private support reports available."]},"child":{"headline":"Clearer setup help for your parent","summary":"Connection help is easier to read and explains what your parent can do next.","highlights":["Your parent can correct Windows time and retry pairing without reinstalling.","Saved work and family settings stay in place.","The support report keeps your name and schoolwork private."]}}),
    Object.freeze({"version":"1.2.251","released_on":"2026-09-27","title":"More ways to create in Art Studio","parent":{"headline":"Creative tools without a crowded canvas","summary":"Select and edit your own marks, add shapes and text, try mirrored drawing, or trace an approved coloring page.","highlights":["Move, resize, rotate, duplicate or delete a selected part of a drawing, with Undo and Cancel.","Shapes, text, color picking and symmetry live in More tools; brush settings appear only when needed.","Marker, pencil, crayon and watercolor-style brushes give children different ways to draw.","Approved library pages can become faint tracing guides that stay separate from printed artwork.","Save a copy keeps the original safe. Existing drawings and protected coloring outlines are preserved."]},"child":{"headline":"Make your picture your own","summary":"Try More tools in Draw & paint.","highlights":["Select part of your drawing to move it, turn it or make a copy.","Add shapes and words, or draw matching sides with Mirror drawing.","Trace a saved page, then hide the guide to see your own art.","Use Save a copy to try a new idea without replacing your original."]}}),
    Object.freeze({"version":"1.2.250","released_on":"2026-09-26","title":"Smarter coloring and new page creation","parent":{"headline":"Coloring with protected outlines and fewer spills","summary":"Open saved pages in Draw & paint, with gap-aware fills and automatic local saves.","highlights":["Fill closes small gaps and asks before coloring a large area that reaches the page edge.","Protected outlines, Undo/Redo, an eraser, color picker, custom colors and zoom make detailed coloring easier.","Existing drawings remain in the local gallery; coloring copies save separately from the original pages.","Cloud page generation is connected to the existing hosted image service, with family limits and parent approval preserved."]},"child":{"headline":"Color your favorite pages","summary":"Choose a saved page, then Color this page to start painting.","highlights":["Use Fill and Close gaps to help keep colors inside shapes.","Undo or Redo a change; use the eraser without losing the page outlines.","Zoom in for small details. Your artwork saves on this computer."]}}),
    Object.freeze({"version":"1.2.249","released_on":"2026-09-26","title":"One Art & Coloring Studio","parent":{"headline":"Drawing, coloring pages and simple printing together","summary":"The child dashboard now opens one Art & Coloring Studio, keeping existing artwork and family rules.","highlights":["Browse larger coloring previews, search your library and open twelve pages at a time.","Print one fitted Letter portrait copy without the Windows print dialog or duplicate clicks.","Drawings save when switching sections or closing; existing artwork stays on the child computer.","Printer setup handles delayed registration and explains permission, driver and Print Spooler problems.","Creating new coloring pages shows its availability clearly. The cloud image service still needs configuration."]},"child":{"headline":"All your art in one place","summary":"Draw, browse coloring pages, and print your favorites from one studio.","highlights":["Use Saved pages, Create a page, or Draw & paint.","Find pictures with larger previews and search.","Print one copy with your saved printer. Your drawings stay on this computer."]}}),
    Object.freeze({"version":"1.2.248","released_on":"2026-09-26","title":"Compact White Noise controls","parent":{"headline":"Less clutter while children study","summary":"White Noise remembers first use and keeps its floating controls small.","highlights":["After the child opens White Noise once, the label stays hidden on that computer, including after reopening.","The wave icon opens sound choices. One Play/Pause button controls the selected sound; the extra Stop button is removed.","White Noise still works during Abeka and keeps its saved sound and volume."]},"child":{"headline":"A smaller sound control","summary":"Keep your sound nearby without a large label.","highlights":["Use the wave icon to choose your sound.","Pause or play with the button beside it.","After your first use, the controls stay compact when you come back."]}}),
    Object.freeze({"version":"1.2.247","released_on":"2026-09-26","title":"Update and wake-up reliability","parent":{"headline":"Clearer restart status and more reliable updates","summary":"Fixes a Windows folder lock during automatic installation and false protection failures after sleep or delayed heartbeats.","highlights":["Update helpers no longer hold the installed application folder open.","Downloaded updates wait for saved work and closed activities while the dashboard remains usable.","Protection failures have a clear parent recovery message and a support report instead of a misleading safe-restart message.","Computers stuck on an older version may need this one-time manual upgrade; publishing does not confirm installation."]},"child":{"headline":"Get back to your activities after a break","summary":"BodeeGuard handles waking up and waiting for updates more reliably.","highlights":["You can keep using the dashboard while an update waits for your work to be saved.","If the computer needs your parent, the message explains what to do.","Your saved work and family settings are kept."]}}),
    Object.freeze({"version":"1.2.246","released_on":"2026-09-26","title":"Mountain Rush joins Family Games","parent":{"headline":"Race together in Mountain Rush","summary":"Children can download and play Mountain Rush from Family Games, with the same access rules and game-time limits.","highlights":["Verified downloads, automatic update checks and Update / repair are built in.","Parents can download the Windows game and join the same-version LAN race as Mom or Dad.","Game time, parent locks and Return to BodeeGuard stay active during play and graphics startup.","Players who share a Windows account share Mountain Rush saved progress."]},"child":{"headline":"Head down the mountain","summary":"Mountain Rush is now in Family Games.","highlights":["Choose Download & play, then pick a mountain and ATV.","Race on your own or join your family on the same home Wi-Fi.","Use Return to BodeeGuard when you are done. Your family game-time rules still apply."]}}),
    Object.freeze({"version":"1.2.245","released_on":"2026-09-26","title":"Connection help on child computers","parent":{"headline":"Clear answers when setup cannot connect","summary":"Run connection checks inside the child app before pairing, with specific results and useful next steps.","highlights":["Checks Windows date/time, BodeeGuard server access, the signed app release and the protection service.","A failed pairing attempt opens the checks and explains what needs attention.","Open date/time settings during setup, retry pairing or copy a technical support report.","Support reports exclude names, documents, passwords and pairing codes."]},"child":{"headline":"Help getting connected","summary":"Your parent has clearer tools to help this computer connect to BodeeGuard.","highlights":["Setup explains connection problems and offers a retry.","Your schoolwork, playlists and saved progress stay in place.","Your name and schoolwork are kept out of the support report."]}}),
    Object.freeze({"version":"1.2.244","released_on":"2026-09-26","title":"Faster media and a personal music library","parent":{"headline":"Music that is easier to manage","summary":"Music, Audiobooks and Videos show the initial library with fewer cloud requests.","highlights":["Music collections load when opened, without holding up the whole library.","Each child can find songs in New to you, hide songs and restore them later.","Browsing a playlist keeps the current song playing.","Pinned players have Stop & close; school opening stops music, while White Noise remains available."]},"child":{"headline":"Your music, your way","summary":"Find something new, keep your playlists and hide songs you want to skip.","highlights":["Look in New to you for songs you have not played yet.","Hidden songs can be restored anytime.","Use Pin to Bottom to keep listening or Stop & close to turn music off.","White Noise has a clear label and a quick Stop button while you study."]}}),
    Object.freeze({"version":"1.2.243","released_on":"2026-09-26","title":"Student themes throughout learning","parent":{"headline":"Readable themes beyond the dashboard","summary":"Each child's chosen colors now follow them into learning, Writing, messages, media and Family Games.","highlights":["Learning windows receive the saved student theme, including light themes.","Clearer prompts, keyboard letters, answer fields, feedback, media controls and message timestamps.","Writing paper, artwork, game pieces and individual subject colors keep their own colors.","Existing active-practice timing and parent controls remain in place."]},"child":{"headline":"Your colors go with you","summary":"Your learning activities now match your chosen theme.","highlights":["Read your words, instructions and answer boxes clearly in light or dark themes.","Your theme follows you into Writing, Messages, media and Family Games.","Your artwork, schoolwork and saved progress stay just as you left them."]}}),
    Object.freeze({"version":"1.2.242","released_on":"2026-09-26","title":"Family plans without the thirty-activity restriction","parent":{"headline":"Room for your whole family plan","summary":"Built-in activities and separate school websites no longer exhaust a thirty-subject allowance.","highlights":["Save and apply family plans with more than thirty distinct activities.","The updated child app syncs and keeps larger activity lists available after reopening.","Existing school links, child assignments and saved work are preserved.","Includes the previous planner themes, readable coins, activity colors and active study timing."]},"child":{"headline":"Your whole plan stays together","summary":"All of the activities your parent assigns can appear on your desk.","highlights":["Larger activity lists sync completely and remain available when you reopen BodeeGuard.","Your school websites, progress and saved work stay in place.","Your planner theme, activity colors and practice timers are kept."]}}),
    Object.freeze({"version":"1.2.241","released_on":"2026-09-26","title":"Themed planner and readable coin balances","parent":{"headline":"A planner that matches each child","summary":"My planner now follows the selected student theme, with a clearer coin balance on smaller or scaled screens.","highlights":["The dashboard planner and assignment form use the selected theme, including light themes.","Coin amounts use lighter text and fit on one line without cutting off digits.","Wallet headings and buttons stay readable in light and dark themes.","Includes the earlier activity colors, learning improvements and inactivity-aware study timing."]},"child":{"headline":"Your planner matches your desk","summary":"Plan your assignments in your chosen colors.","highlights":["My planner uses your theme, including the assignment form.","Your coin balance fits on one line with clearer text.","Your saved assignments and coins stay unchanged."]}}),
    Object.freeze({"version":"1.2.240","released_on":"2026-09-24","title":"Study time pauses when a child is inactive","parent":{"headline":"More accurate school time","summary":"Unattended study pages stop adding time, while playing video lessons can continue without mouse or keyboard activity.","highlights":["Typing School counts actual exercise typing and pauses shortly after typing stops.","Other assigned study activities pause after two minutes without input.","School websites can keep counting while a visible lesson video advances; paused, stalled or finished video does not extend idle time.","Sleep, lock, breaks and background windows pause school time. Previously saved history stays unchanged.","Includes the earlier activity colors and learning improvements. Update the child app to apply these rules."]},"child":{"headline":"Your practice time counts","summary":"Study time pauses when you step away.","highlights":["Type in an exercise to earn Typing School time.","Continue working or play your lesson to resume paused study time.","Breaks, sleep and inactive windows do not keep adding school time."]}}),
    Object.freeze({"version":"1.2.239","released_on":"2026-09-24","title":"Learning improvements and the complete pending update","parent":{"headline":"Your requested learning improvements are included","summary":"This cumulative release brings together the pending school video, Spelling, Vocabulary, Poems and default activity changes.","highlights":["Spelling progresses per word from copying to rotating letter hints and unaided recall.","Vocabulary distinguishes practice, test readiness and later retention.","Daily Plan includes Letters handwriting and Numerals; existing child choices stay intact until you apply changes.","School video fullscreen and caption controls are repaired. Poem narration supports a shared ElevenLabs voice and family audio caching when the provider is configured.","Active typing time, individual activity colors and Mom/Dad family games remain included."]},"child":{"headline":"Practice, remember and keep learning","summary":"Updated learning activities help you work toward your spelling and vocabulary tests.","highlights":["Spelling hints change as each word becomes more familiar.","Vocabulary gives you meaning checks and practice remembering words.","Poem listening and recitation use clear icons and improved narration support.","School video fullscreen and captions controls are easier to use."]}}),
    Object.freeze({version:'1.2.238',released_on:'2026-09-24',title:'Typing time counts actual practice',
      parent:Object.freeze({headline:'Typing goals require active practice',summary:'Leaving Typing School open no longer counts toward a daily schoolwork goal.',highlights:Object.freeze([
        'Time begins when the child types in a lesson or speed test.',
        'The school timer pauses shortly after typing stops and when the window loses focus.',
        'Holding down a key does not earn practice time. Activity colors and family board games remain included.'
      ])}),
      child:Object.freeze({headline:'Your practice time counts',summary:'Type in a lesson or speed test to work toward your daily goal.',highlights:Object.freeze([
        'Opening Typing School by itself does not start your schoolwork timer.',
        'Taking a break pauses your typing time automatically.',
        'Your saved results and typing scores stay available.'
      ])})}),
    Object.freeze({version:'1.2.237',released_on:'2026-09-24',title:'Play board games with Mom and Dad',
      parent:Object.freeze({headline:'Join your children in Family Games',summary:'Parents can play as Mom or Dad from the parent dashboard, with clearer Windows game downloads.',highlights:Object.freeze([
        'Play Chess, Connect Four, Checkers and Fleet Battle in a private family room.',
        'Children retain their Family Games hours and daily time limits.',
        'Includes the student activity colors from version 1.2.236.'
      ])}),
      child:Object.freeze({headline:'Play with your family',summary:'Invite Mom, Dad or a sibling to your board game.',highlights:Object.freeze([
        'Open Family Games and choose Play with Mom, Dad or siblings.',
        'One player hosts and the other joins the same game.',
        'Your activities keep their familiar individual colors.'
      ])})}),
    Object.freeze({version:'1.2.236',released_on:'2026-09-24',title:'Colorful student activity cards',
      parent:Object.freeze({headline:'Activity colors now match your Daily Plan',summary:'Children can find familiar activities by the same colors used in the parent plan.',highlights:Object.freeze([
        'Student dashboard cards use each built-in activity color from Daily Plan.',
        'Custom subject colors stay intact.',
        'Required and completed schoolwork still show their clear status labels.'
      ])}),
      child:Object.freeze({headline:'Find activities by color',summary:'Your dashboard cards now use a different color for each kind of activity.',highlights:Object.freeze([
        'Spelling, Music, Reading and other activities keep their own colors.',
        'Schoolwork labels still show what is required or finished.',
        'Your parent-selected colors still appear on your cards.'
      ])}),
    }),
    Object.freeze({version:'1.2.235',released_on:'2026-09-22',title:'A more compact daily dashboard',
      parent:Object.freeze({headline:'A more compact daily dashboard',summary:'The daily Bible question has more room without making the full row too tall.',highlights:Object.freeze([
        'The Bible verse and question share a wider card on desktop screens.',
        'Daily cards keep their own natural height instead of stretching together.',
        'Smaller screens arrange the daily cards in readable rows.'
      ])}),
      child:Object.freeze({headline:'Your daily questions are easier to read',summary:'The Bible verse and question have more space on your dashboard.',highlights:Object.freeze([
        'Read the verse beside its question when your screen has room.',
        'The daily cards take up less space above your schoolwork.',
        'Answers remain visible on smaller screens.'
      ])})}),
    Object.freeze({version:'1.2.234',released_on:'2026-09-22',title:'Full-screen activities and a clearer dashboard',
      parent:Object.freeze({headline:'Full-screen activities and a clearer dashboard',summary:'Fixes small practice windows, reduces background processing and makes dashboard controls and daily cards easier to use.',highlights:Object.freeze([
        'Learning activities open across the full study monitor, including monitors with display scaling.',
        'Activities stay on the study screen while additional monitors remain covered.',
        'Fullscreen recovery avoids repeated window resizing during normal use.',
        'Practice and dashboard updates read only the saved records they need.',
        'Overlapping dashboard refreshes share a request while still receiving the latest changes.',
        'Dashboard shortcuts are grouped clearly, and daily cards show their text without internal scrolling.'
      ])}),
      child:Object.freeze({headline:'More room for your schoolwork',summary:'Your practice activities now use the whole study screen.',highlights:Object.freeze([
        'Typing, Logic and Confused Words fill your screen when you open them.',
        'Spelling, Vocabulary and learning videos use the same corrected window setup.',
        'Use the Dashboard button when you are ready to return to your activities.',
        'Find Grades by its clipboard icon; the lock opens Parent controls.',
        'Read the full daily verse, brain teaser and study streak without scrolling inside their cards.'
      ])})}),
    Object.freeze({version:'1.2.233',released_on:'2026-09-21',title:'Startup repair for scaled monitors',
      parent:Object.freeze({headline:'Reliable startup with a second monitor',summary:'Fixes a startup check that rejected the second-screen cover on Windows computers with display scaling.',highlights:Object.freeze([
        'Second-screen covers fill the entire display, including the taskbar area.',
        'Display scaling no longer causes an exact-size mismatch during installation.',
        'Startup errors appear in front of the study window so parents can see and close them.'
      ])}),
      child:Object.freeze({headline:'Get back to your dashboard',summary:'A startup fix helps BodeeGuard open correctly when this computer uses more than one screen.',highlights:Object.freeze([
        'Your other screen stays covered while you study.',
        'The loading screen can finish its checks on monitors with different display scales.',
        'If startup needs help, your parent can see the error above the study screen.'
      ])})}),
    Object.freeze({version:'1.2.232',released_on:'2026-09-21',title:'Update handoff repair and extra-display protection',
      parent:Object.freeze({headline:'Reliable update-screen handoff',summary:'Fixes the update interruption caused by waiting for the updating screen to close before installation could begin. Affected older builds need one manual upgrade.',highlights:Object.freeze([
        'The updater proceeds after confirming that the updating screen is ready and its launcher has exited successfully.',
        'The updating screen remains open during installation and until the protected child workspace is ready.',
        'Additional monitors receive a still cover during protected child sessions, including screens connected during use.'
      ])}),
      child:Object.freeze({headline:'A smoother update handoff',summary:'BodeeGuard keeps its updating screen in place while preparing to reopen your workspace.',highlights:Object.freeze([
        'Fixes an update interruption that could repeat even after the update had downloaded.',
        'Your workspace is saved before it closes for an update.',
        'Extra monitors stay covered while your protected school session is running.'
      ])})}),
    Object.freeze({version:'1.2.231',released_on:'2026-09-21',title:'Faster schoolwork and smoother activity changes',
      parent:Object.freeze({headline:'Less background work while your child studies',summary:'This update reduces repeated dashboard, schedule and saved-history work and improves transitions between school activities.',highlights:Object.freeze([
        'The dashboard uses less processing time, including on computers with a large saved media history.',
        'Activities avoid unnecessary fullscreen changes, and Typing shows a loading screen and updated study time.',
        'Worksheet previews are reused and recover more reliably when switching filters.',
        'Opening school stops Music and Audiobooks, including parent-unlocked playback.',
        'White Noise remembers the selected track and keeps a clear Play control within reach.'
      ])}),
      child:Object.freeze({headline:'Keep studying with a smoother dashboard',summary:'Move between activities with less background work and clearer loading feedback.',highlights:Object.freeze([
        'Typing shows your study time and a BodeeGuard loading screen while opening.',
        'Worksheet previews stay ready as you move between pages and filters.',
        'White Noise remembers your sound so you can press Play again next time.',
        'Music and Audiobooks stop when you open school.',
        'Geography, Confused Words and Logic have quiet answer sounds you can turn off.'
      ])})}),
    Object.freeze({version:'1.2.230',released_on:'2026-09-21',title:'Reliable parent-recovery setup',
      parent:Object.freeze({headline:'Install even when another app uses a shortcut',summary:'BodeeGuard keeps two independent parent-recovery shortcuts while allowing setup to choose a safe fallback when another Windows app already owns one.',highlights:Object.freeze([
        'Ctrl+Alt+Q is the primary parent-recovery shortcut on a protected child computer.',
        'Ctrl+Shift+Q and Ctrl+Shift+F10 provide fallback choices when Windows reports a shortcut conflict.',
        'Protection still refuses to start unless two independent parent-recovery shortcuts are available.'
      ])}),
      child:Object.freeze({headline:'A more reliable BodeeGuard start',summary:'BodeeGuard can start safely when another Windows app already uses one of its parent shortcuts.',highlights:Object.freeze([
        'The parent recovery screen remains available through two protected keyboard shortcuts.',
        'A single shortcut conflict no longer stops setup and sends the computer back to Windows.',
        'Ctrl+Alt+Q remains the main shortcut parents can use to open Parent controls.'
      ])})}),
    Object.freeze({version:'1.2.229',released_on:'2026-09-21',title:'Smoother updates, Logic sessions and clearer schoolwork',
      parent:Object.freeze({headline:'A safer update handoff and fewer Logic interruptions',summary:'BodeeGuard keeps an Updating cover visible during automatic installation, reopens the protected child app promptly and sends a completed Logic session in one batch.',highlights:Object.freeze([
        'Logic answers are saved locally during the daily session and submitted together at completion, with encrypted retry recovery if the connection fails.',
        'Parent Quick Unlock choices for Music and Audiobooks remain active through child dashboard and media refreshes while daily limits still apply.',
        'The child app recovers fullscreen focus after protected activity windows and automatic updates without leaving the Windows desktop exposed longer than necessary.',
        'New Planner assignments default four days ahead, and school activity cards show clearer time-used and completion status.'
      ])}),
      child:Object.freeze({headline:'Keep working with fewer interruptions',summary:'Logic continues locally between questions, updates show a protected cover and your school cards are easier to read.',highlights:Object.freeze([
        'Finish the daily Logic session before BodeeGuard sends the results and awards the saved coins.',
        'An Updating screen stays visible while a new BodeeGuard version installs and the dashboard reopens.',
        'Music or Audiobooks unlocked by your parent stay available after the dashboard refreshes.',
        'Planner starts new assignments four days ahead, while time used today and completed schoolwork have clearer labels and icons.'
      ])})}),
    Object.freeze({version:'1.2.228',released_on:'2026-09-17',title:'Approved Windows apps and flexible music playlists',
      parent:Object.freeze({headline:'Approve local apps and organize imported music',summary:'Parents can approve an installed Windows app for one child computer, and children can save individual songs from approved imported playlists.',highlights:Object.freeze([
        'Each approved Windows app stays tied to the child computer where the parent selected it.',
        'Songs from a parent-approved imported playlist can be added to a child-created playlist or Favorites.',
        'BodeeGuard verifies the source playlist and song before adding it, avoids duplicates and preserves disabled-song decisions.'
      ])}),
      child:Object.freeze({headline:'Build playlists from approved music',summary:'Add a song from an imported playlist to one of your own playlists or Favorites.',highlights:Object.freeze([
        'Use the plus button beside an imported song and choose where to save it.',
        'A saved song appears in your library without duplicating an existing copy.',
        'Parent-approved Windows apps can open from your BodeeGuard dashboard on their assigned computer.'
      ])})}),
    Object.freeze({version:'1.2.227',released_on:'2026-09-14',title:'A smoother student dashboard',
      parent:Object.freeze({headline:'Less background work on the child’s computer',summary:'The student dashboard keeps unchanged cards and icons in place and uses lighter visual effects.',highlights:Object.freeze([
        'Routine status updates no longer redraw unchanged dashboard content.',
        'A timer change updates its activity without rebuilding every card.',
        'Parent locks, permissions and messages continue to take effect immediately.'
      ])}),
      child:Object.freeze({headline:'Keep moving through your dashboard',summary:'Your dashboard uses less background work while you study.',highlights:Object.freeze([
        'Activity cards stay in place when other activities update.',
        'Lighter visual effects reduce graphics work while keeping your theme.',
        'Planner and White Noise controls avoid unnecessary refreshes.'
      ])})}),
    Object.freeze({version:'1.2.226',released_on:'2026-09-14',title:'Assigned handwriting practice and a clearer dashboard',
      parent:Object.freeze({headline:'Choose handwriting practice for each child',summary:'Add Handwriting in Subjects, choose letters and a daily practice time, and include it in the child’s school plan.',highlights:Object.freeze([
        'Assigned children open guided letter practice inside BodeeGuard without another login.',
        'Required practice time must be completed before after-school activities unlock.',
        'Activity cards hide unused timers and schedules that do not apply.'
      ])}),
      child:Object.freeze({headline:'Practice your letters and keep studying',summary:'Your assigned Handwriting lessons open from your school dashboard.',highlights:Object.freeze([
        'Follow the letters your parent selected and complete your daily practice time.',
        'White Noise has a floating control with quick pause and play.',
        'Use the message icon at the top to contact your parents.'
      ])})}),
    Object.freeze({version:'1.2.225',released_on:'2026-09-14',title:'White Noise for school and study',
      parent:Object.freeze({headline:'Calm sounds while your child studies',summary:'White Noise is available during school, separate from Music and its time allowance.',highlights:Object.freeze([
        'Seven shared tracks include rain, a sleeper train, deep rumble and four calm piano tracks.',
        'Upload private family MP3s and turn White Noise on or off for each child.',
        'Tracks download once and play from the child computer, including offline after download.'
      ])}),
      child:Object.freeze({headline:'Choose a calm sound for studying',summary:'Open White Noise from your dashboard or school toolbar, then choose a sound.',highlights:Object.freeze([
        'Your selected track repeats until you stop it or choose another sound.',
        'Close the sound panel and keep studying while it plays.',
        'Your dashboard icons and school toolbar are clearer, with fewer repeated buttons.'
      ])})}),
    Object.freeze({version:'1.2.224',released_on:'2026-09-14',title:'Accurate Abeka completion and direct video lessons',
      parent:Object.freeze({headline:'Abeka stays unfinished until all assigned lessons are checked',summary:'This update corrects Abeka completion readings and restores direct access to the video library.',highlights:Object.freeze([
        'Unchecked Abeka lessons no longer count as completed, including multiple lessons in one subject.',
        'Fresh verified readings can correct an earlier false completion while preserving parent decisions.',
        'Abeka opens Video Lessons directly with the saved local school session.'
      ])}),
      child:Object.freeze({headline:'Open your Abeka lessons directly',summary:'Your Abeka button opens Video Lessons, with the BodeeGuard toolbar keeping your school pages within reach.',highlights:Object.freeze([
        'Grades & To-Do still opens your assignments and grades in the same window.',
        'The extra Abeka header is hidden on your school pages.',
        'Your school progress follows the completed lessons in My Lessons Today.'
      ])})}),
    Object.freeze({version:'1.2.223',released_on:'2026-09-14',title:'Student profiles, parent recovery and local controls',
      parent:Object.freeze({headline:'A clearer student dashboard and more reliable parent recovery',summary:'This update brings saved child photos to the installed dashboard, enlarges the coin balance and improves Parent controls when a window stalls.',highlights:Object.freeze([
        'Parent profile pictures are saved privately on the assigned child computer and only downloaded again when changed.',
        'Parent controls and both exit shortcuts recover more reliably during refresh and update preparation.',
        'Bluetooth headset setup and a cancellable ten-second Sleep countdown are available in the child app.',
        'Song requests show recent decisions, retain retry drafts and refresh approved songs without interrupting playback.'
      ])}),
      child:Object.freeze({headline:'Your picture, bigger coins and easier connections',summary:'Your dashboard shows your parent-selected picture and a larger coin balance.',highlights:Object.freeze([
        'Reconnect your Bluetooth headset from Wi-Fi, headsets & printers.',
        'Sleep gives you ten seconds to choose Don’t go to sleep.',
        'See recent song requests and keep a request draft if your connection drops.',
        'Newly approved songs appear in your music library.'
      ])})}),
    Object.freeze({version:'1.2.222',released_on:'2026-09-13',title:'Abeka grades and assignments',
      parent:Object.freeze({headline:'Keep Abeka grades and assignments within reach',summary:'Children can open their Abeka student dashboard and return to video lessons from the school toolbar.',highlights:Object.freeze([
        'Grades & To-Do opens the Abeka student dashboard inside BodeeGuard.',
        'Video Lessons returns to Abeka lessons using the same saved local login session.',
        'School breaks, parent controls and selected playback speed continue to apply.'
      ])}),
      child:Object.freeze({headline:'See your assignments and return to lessons',summary:'Two new Abeka buttons help you move between your school pages.',highlights:Object.freeze([
        'Choose Grades & To-Do to see your grades and upcoming assignments.',
        'Choose Video Lessons to go back to your lessons.',
        'Both pages stay inside BodeeGuard with your saved Abeka sign-in.'
      ])})}),
    Object.freeze({version:'1.2.221',released_on:'2026-09-12',title:'Private recovery backups and local storage improvements',
      parent:Object.freeze({headline:'Protect saved schoolwork and reduce cloud traffic',summary:'This family test release adds optional private recovery backups for writing and planners, improves local storage, and strengthens message and cloud reliability.',highlights:Object.freeze([
        'Enable Computer backups & recovery in History & privacy to recover writing and planner entries on a paired replacement computer.',
        'Media and local records use smaller individual updates. Parent controls and device authorization remain enforced.',
        'The existing approved game download and hash verification remain in place; additional game signing is deferred.'
      ])}),
      child:Object.freeze({headline:'Keep your work safe and your dashboard responsive',summary:'Your writing and planner stay on this computer, with a private recovery copy when your parent enables backups.',highlights:Object.freeze([
        'Saved work uses more efficient local storage.',
        'Message replies finish before the notification closes.',
        'Connected school access renews automatically using your saved computer registration.'
      ])})}),
    Object.freeze({version:'1.2.220',released_on:'2026-09-11',title:'Reliable message replies',
      parent:Object.freeze({headline:'Message replies no longer freeze the child app',summary:'This test build fixes the notification-window crash seen after a child replied to the last parent message.',highlights:Object.freeze([
        'The reply reaches the parent before the child notification closes.',
        'Closing a message no longer leaves child-window protection attached to a window that is already gone.',
        'A disconnected launcher output pipe cannot turn normal error reporting into another JavaScript error.'
      ])}),
      child:Object.freeze({headline:'Reply and keep going',summary:'You can answer a parent message and return to your work without BodeeGuard freezing.',highlights:Object.freeze([
        'Your reply finishes sending before the message closes.',
        'The message window closes cleanly after the final message.',
        'Your dashboard and activities stay responsive.'
      ])})}),
    Object.freeze({version:'1.2.219',released_on:'2026-09-11',title:'Update handoff recovery and faster startup',
      parent:Object.freeze({headline:'More reliable update preparation',summary:'This test build corrects inconsistent update timing and prevents an interrupted pre-install handoff from permanently blocking a valid release.',highlights:Object.freeze([
        'Local work is saved before the native restart timer begins.',
        'Interrupted handoffs retry with bounded delays only when the old installation is intact and no installation journal exists.',
        'The child opens a local preloader and restores its saved dashboard before waiting for the network.'
      ])}),
      child:Object.freeze({headline:'A smoother start',summary:'Your saved dashboard opens with a loading screen while BodeeGuard gets ready.',highlights:Object.freeze([
        'You no longer briefly see Choose a child when your computer is already connected.',
        'BodeeGuard finishes saving your work before preparing an update restart.',
        'Interrupted update preparation can retry automatically.'
      ])})}),
    Object.freeze({version:'1.2.218',released_on:'2026-09-11',title:'School stays open beyond the school calendar',
      parent:Object.freeze({headline:'Always-open schoolwork',summary:'School subjects default to Always open, so the afternoon calendar cutoff no longer interrupts lessons.',highlights:Object.freeze([
        'Subjects → Edit Subject → Availability includes Always open; turn it off to choose scheduled access.',
        'School remains accessible after hours and on days off. Required work still controls after-school rewards.',
        'Explicit Certain days & times plans, parent locks and activity limits remain enforced.'
      ])}),
      child:Object.freeze({headline:'Keep learning after the school day',summary:'Your school can stay open when the usual school hours end.',highlights:Object.freeze([
        'Always-open lessons no longer close at the afternoon cutoff.',
        'School time continues recording locally while you work, including offline.',
        'Always-open school appears with optional activities on days when that work is not required.'
      ])})}),
    Object.freeze({version:'1.2.217',released_on:'2026-09-11',title:'Update preparation keeps Parent controls available',
      parent:Object.freeze({headline:'Reach Parent controls while an update waits',summary:'This test update fixes the page freeze that disabled Parent controls during update preparation and explains what is delaying a restart.',highlights:Object.freeze([
        'Parent controls stay clickable while an update saves work. Password verification remains required.',
        'Finishing Refresh triggers a prompt local check of the downloaded update without another download.',
        'Update messages identify an open message, activity or draft. Failed preparation restores the dashboard.'
      ])}),
      child:Object.freeze({headline:'Know when your update is ready',summary:'Update messages explain when BodeeGuard is waiting, saving or restarting.',highlights:Object.freeze([
        'See which activity or open draft needs attention before restarting.',
        'Your parent can open Parent controls while BodeeGuard prepares the update.',
        'Your dashboard becomes available again if update preparation cannot finish.'
      ])})}),
    Object.freeze({version:'1.2.216',released_on:'2026-09-11',title:'Your daily plan and student planner',
      parent:Object.freeze({headline:'School requirements and available activities are clearer',summary:'Daily Plan now includes Games, and the child dashboard follows assigned work, time goals and parent unlocks.',highlights:Object.freeze([
        'Schedule Games by day and time. Writing and available optional activities appear below schoolwork.',
        'Unassigned Spelling, Vocabulary and Poems stay hidden. Abeka waits for lesson completion, and Typing requires its full time goal.',
        'Parent-unlocked music appears during school. After-school activities appear when all required work is complete.',
        'Children can save assignments and due-date reminders in their local Planner while using Abeka or from the dashboard.'
      ])}),
      child:Object.freeze({headline:'See your work and remember what is due',summary:'Your dashboard shows the work assigned to you and the activities you can open.',highlights:Object.freeze([
        'Use Planner during a lesson to add an assignment, a due date and reminders.',
        'Writing and other available activities appear below your school subjects.',
        'Finish your assigned work and Typing goal to open after-school activities.',
        'Saving and returning from Vocabulary clears its study bar.'
      ])})}),
    Object.freeze({version:'1.2.215',released_on:'2026-09-11',title:'School breaks keep your lesson open',
      parent:Object.freeze({headline:'Breaks pause school time without closing the lesson',summary:'The Break button now keeps the school page in place while a local break timer runs.',highlights:Object.freeze([
        'School time stops during a break. Resume returns to the same page and any unfinished answers.',
        'Abeka opens through its sign-in page and keeps its saved session on the child computer.',
        'The student wallet has its blue and gold styling and Open Store button again.'
      ])}),
      child:Object.freeze({headline:'Take a break and keep your place',summary:'Your lesson stays open while you are on a break.',highlights:Object.freeze([
        'Press Break to pause school time and see your break timer.',
        'Press Resume school to return to your lesson, then press Play when you are ready.',
        'Your wallet and Open Store button are easier to spot.'
      ])})}),
    Object.freeze({version:'1.2.214',released_on:'2026-09-11',title:'Clearer update status and installation diagnostics',
      parent:Object.freeze({headline:'See why an update is waiting',summary:'This test release improves failed-update feedback and installation diagnostics. The cause of the previous automatic-install failure is still under investigation.',highlights:Object.freeze([
        'A rejected update shows its version, the installed version and why pressing Update cannot retry it.',
        'Installer checkpoints distinguish an early wrapper exit from a native installation failure.',
        'The updater keeps version and recovery checks in place before reporting success.'
      ])}),
      child:Object.freeze({headline:'Clearer update messages',summary:'BodeeGuard explains when an update could not finish.',highlights:Object.freeze([
        'See which version is still installed if an update fails.',
        'The message explains when BodeeGuard is waiting for a newer release.',
        'Your schoolwork stays saved while BodeeGuard checks an update.'
      ])})}),
    Object.freeze({version:'1.2.213',released_on:'2026-09-11',title:'Stronger Windows fullscreen protection',
      parent:Object.freeze({headline:'BodeeGuard returns to the protected screen',summary:'This test update strengthens fullscreen recovery and keyboard safeguards. Physical Windows escape testing is still required.',highlights:Object.freeze([
        'The student dashboard opens fullscreen and recovers after wake, unlock and display changes.',
        'Additional Windows and browser shortcuts are intercepted, and media developer tools are disabled.',
        'Parent-authorized exit remains available. A failed exit restores protection instead of leaving it paused.'
      ])}),
      child:Object.freeze({headline:'Your dashboard fills the screen',summary:'BodeeGuard keeps your school and activities in view.',highlights:Object.freeze([
        'The dashboard appears when it is ready, without briefly showing a smaller window.',
        'Returning from an activity brings your dashboard back into view.',
        'Replying to a parent message keeps the message controls ready for typing.'
      ])})}),
    Object.freeze({version:'1.2.212',released_on:'2026-09-10',title:'Voice messages that play from start to finish',
      parent:Object.freeze({headline:'Record and preview a voice message',summary:'Messages now includes a microphone button in the parent dashboard.',highlights:Object.freeze([
        'Record up to 60 seconds, listen to the preview, then send or discard.',
        'Audio keeps playing when delivery receipts or other messages arrive.',
        'Your voice draft stays with its child, and retrying an uncertain send does not duplicate it.'
      ])}),
      child:Object.freeze({headline:'Hear the whole voice message',summary:'Message updates keep your audio player in place.',highlights:Object.freeze([
        'Listen to voice messages from your parent without a refresh cutting them off.',
        'Record a reply, listen to it first, then send it.',
        'Recordings stop after one minute. Microphone access ends when recording stops.'
      ])})}),
    Object.freeze({version:'1.2.211',released_on:'2026-09-10',title:'Four familiar games for siblings on your home network',
      parent:Object.freeze({headline:'Chess, Connect Four, Checkers and Fleet Battle',summary:'Children can host and join these games inside the Windows app.',highlights:Object.freeze([
        'One child hosts; a sibling joins on the same home network. No parent computer is needed.',
        'Your existing Family Games permissions, hours and time allowances still apply.',
        'Boards and moves stay on the home network, with recent results saved on each child’s computer.'
      ])}),
      child:Object.freeze({headline:'Play a board game with a sibling',summary:'Choose Chess, Connect Four, Checkers or Fleet Battle in Family Games.',highlights:Object.freeze([
        'Choose Host game, then ask a sibling to join from their computer.',
        'The board fills BodeeGuard while you play, with touch-friendly controls.',
        'If your connection drops, reconnect while the host keeps the room open.'
      ])})}),
    Object.freeze({version:'1.2.210',released_on:'2026-09-10',title:'Download and play your Windows family games',
      parent:Object.freeze({headline:'Windows games connected',summary:'Children can download, update and play the four larger games from Family Games.',highlights:Object.freeze([
        'Access, required schoolwork, allowed hours and game time still apply.',
        'Paintball, Rally Rascals and Canaan use their own host and join screens on your home network.',
        'The Lesson Village is single-player. These downloads appear only in the Windows child app.'
      ])}),
      child:Object.freeze({headline:'Your family adventures are ready to download',summary:'Choose a picture, download the game once and play.',highlights:Object.freeze([
        'See download progress and your installed game version. Updates are checked before play.',
        'Use the BodeeGuard button or Ctrl+Shift+G to return from a game.',
        'Your game timer stays on this computer. Family multiplayer uses the same home router.'
      ])})}),
    Object.freeze({version:'1.2.209',released_on:'2026-09-10',title:'A clearer Family Game Room',
      parent:Object.freeze({headline:'Family access and game previews together',summary:'Family Games now has compact child cards and a screenshot gallery.',highlights:Object.freeze([
        'See remaining game time, allowed days and hours for each child.',
        'Change access and school requirements in a wider settings window.',
        'Preview the larger family games in full screen. Their cloud launch is not connected yet.'
      ])}),
      child:Object.freeze({headline:'Explore your family game room',summary:'Big picture banners make the larger games easier to recognize.',highlights:Object.freeze([
        'Preview The Lesson Village, Paintball, Rally Rascals and Conquering of Canaan.',
        'Use arrow keys or the Previous and Next buttons to browse pictures.',
        'Checkers is ready to play with a sibling when your parent allows it.'
      ])})}),
    Object.freeze({version:'1.2.207',released_on:'2026-09-10',title:'A daily plan for each child',
      parent:Object.freeze({headline:'See school and rewards in one place',summary:'Open Daily plan in the parent dashboard to arrange each child’s activities.',highlights:Object.freeze([
        'Drag activities into School, Open after school, or Certain days & times.',
        'Set required minutes, activity days and media allowances in the same view.',
        'Save a child’s plan without changing a sibling’s settings.'
      ])}),
      child:Object.freeze({headline:'Your activities follow your daily plan',summary:'School requirements and activity hours stay saved on this computer.',highlights:Object.freeze([
        'Required schoolwork opens your after-school activities when finished.',
        'Activities follow the days and hours your parent chooses.',
        'Your daily media allowance includes any extra time your parent adds.'
      ])})}),
    Object.freeze({version:'1.2.206',released_on:'2026-09-10',title:'Rewards unlock after required schoolwork',
      parent:Object.freeze({headline:'Automatic after-school access',summary:'Required lessons, daily word work and timed activities share the same completion check.',highlights:Object.freeze([
        'Finishing Spelling, Vocabulary or Poems refreshes the child’s unlock rules automatically.',
        'Reaching an assigned time goal sends saved study time without waiting for a background refresh.',
        'Optional spelling stays optional. Reward hours, allowances and parent locks still apply.'
      ])}),
      child:Object.freeze({headline:'Finish your work, then enjoy your rewards',summary:'Your after-school activities update when required work is complete.',highlights:Object.freeze([
        'Complete your assigned lessons and daily word work.',
        'Meet any daily activity goals your parent sets, such as Typing.',
        'Your available rewards refresh automatically.'
      ])})}),
    Object.freeze({version:'1.2.205',released_on:'2026-09-10',title:'Writing fits your workspace',
      parent:Object.freeze({headline:'Writing stays inside BodeeGuard',summary:'Writing fills the app when opened from the dashboard and shares the screen with an open school website.',highlights:Object.freeze([
        'Open Writing from the school toolbar without closing or reloading the lesson.',
        'Close Writing to return the school page to its full size.',
        'Local drafts, printing and submission to the parent remain available.'
      ])}),
      child:Object.freeze({headline:'Write beside your lesson',summary:'Use Writing on its own or alongside school.',highlights:Object.freeze([
        'Writing fills BodeeGuard when you open it from your dashboard.',
        'Choose Writing in the school toolbar to take notes beside the lesson.',
        'Close Writing saves your draft and gives you the whole school screen again.'
      ])})}),
    Object.freeze({version:'1.2.204',released_on:'2026-09-10',title:'See update progress beside Refresh',
      parent:Object.freeze({headline:'Clear feedback during an update check',summary:'The child dashboard shows update progress after Refresh.',highlights:Object.freeze([
        'See the installed version, target update version, downloaded megabytes and a real progress bar.',
        'Completed update checks and refresh confirmations disappear automatically.',
        'Progress uses the existing local updater status without additional server checks.'
      ])}),
      child:Object.freeze({headline:'See what Refresh is doing',summary:'Update progress appears next to the Refresh button.',highlights:Object.freeze([
        'See the version being downloaded and its progress before verification and restart.',
        'An up-to-date message disappears after a few seconds.',
        'Background update checks stay quiet while you work.'
      ])})}),
    Object.freeze({version:'1.2.203',released_on:'2026-09-10',title:'Finish setup before checking updates',
      parent:Object.freeze({headline:'Clearer startup and update feedback',summary:'The app waits for installation to finish before checking updates, avoiding a temporary old repair warning.',
        highlights:Object.freeze(['The refresh success message disappears after four seconds.', 'Daily Questions can open without a new wallet receipt.', 'This release is the next Family Beta automatic-update test.'])}),
      child:Object.freeze({headline:'A quieter dashboard',summary:'Startup and refresh messages stay out of your way.',
        highlights:Object.freeze(['Refresh success messages disappear automatically.', 'Daily Questions can open while your saved coin balance stays in place.', 'Setup finishes before the app starts checking updates.'])})}),
    Object.freeze({version:'1.2.202',released_on:'2026-09-10',title:'Update repair recovery',
      parent:Object.freeze({headline:'Clear an old update repair warning',summary:'A verified manual installation can clear a repair flag left by an earlier update.',
        highlights:Object.freeze(['The installer checks the files and app startup before clearing the old flag.', 'Repair warnings now send a bounded support report.', 'Computers already blocked by the old updater need this installer once.'])}),
      child:Object.freeze({headline:'Update recovery improved',summary:'BodeeGuard can resume checking for updates after your parent repairs the installation.',
        highlights:Object.freeze(['Your saved account and local work stay in place.', 'Update checks can resume after a successful repair.', 'If an update needs help, BodeeGuard sends a support report.'])})}),
    Object.freeze({version:'1.2.201',released_on:'2026-09-10',title:'Parent dashboard computer controls',
      parent:Object.freeze({headline:'Control child computers from your dashboard',summary:'Lock all computers, close BodeeGuard remotely, or unlock an assigned subject for today.',
        highlights:Object.freeze(['The updated time sits beside Refresh.', 'Close BodeeGuard exits to Windows and stays closed until reopened.', 'Quick Unlock lasts through today; normal daily media limits still apply.'])}),
      child:Object.freeze({headline:'Your parent can help remotely',summary:'Your parent can lock or close BodeeGuard from their dashboard.',
        highlights:Object.freeze(['A locked computer shows a clear pause screen.', 'Opening BodeeGuard again starts your normal protected dashboard.', 'Your local work is saved before the app closes.'])})}),
    Object.freeze({
      version: '1.2.191', released_on: '2026-09-09', title: 'Writing, printing and Wi-Fi setup',
      parent: Object.freeze({ headline: 'Set up each child’s connections in BodeeGuard',
        summary: 'Writing is easier to find and can print. Each child computer has its own Wi-Fi and printer setup.',
        highlights: Object.freeze(['Writing keeps local drafts and prints directly to the computer’s printer.', 'Find network printers and remember a printer for this computer.', 'Reconnect saved Wi-Fi or enter a nearby home network’s password in the app.', 'Parent activity restrictions still apply. Some printers need Windows permission or a manufacturer driver.']) }),
      child: Object.freeze({ headline: 'Write, print and reconnect', summary: 'Open Writing to create your work and use Print when you’re ready.',
        highlights: Object.freeze(['Use Wi-Fi & printers to reconnect or find your printer.', 'Your computer remembers your printer choice.', 'Writing saves on this computer. Submit sends a copy to your parent.']) })
    }),
    Object.freeze({
      version: '1.2.167', released_on: '2026-09-07', title: 'Private Cloud original dashboard and Messages transfer',
      parent: Object.freeze({
        headline: 'Original student presentation and durable voice messages',
        summary: 'Private validation only. Dashboard/theme services are online, and a local Admin backup/restore rehearsal is available. Family history has not been imported and the complete student transfer is still in progress.',
        highlights: Object.freeze([
          'The child uses the original dashboard, subject cards, themes, Notebook presentation and Messages composer.',
          'Voice and file messages remain encrypted on the child computer until their separate upload and message receipts are confirmed; retries survive restart.',
          'Parent and child received study time use the same family school date. Untransferred balances, mastery and lesson completion remain explicitly unavailable.',
          'Keep the current family installation. Remaining modules, history import and Windows acceptance are required before cutover.'
        ])
      }),
      child: Object.freeze({
        headline: 'Your familiar Messages screen in the Cloud test',
        summary: 'Use quick replies, emojis, a typed message or a voice recording to contact your parent. This is still a private test app.',
        highlights: Object.freeze([
          'Listen to your recording before choosing Send or Discard.',
          'Sent messages and attachments wait on this computer when the connection is unavailable.',
          'Choose your original dashboard theme and open your assigned school cards.',
          'Use your current school app until your parent finishes Cloud testing.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.166', released_on: '2026-09-07', title: 'Private Cloud automatic pairing and working setup controls',
      parent: Object.freeze({
        headline: 'Open the child app and use the displayed code',
        summary: 'Fixes the invisible dashboard layer that intercepted setup clicks. Private validation only; the existing LAN installation stays separate.',
        highlights: Object.freeze([
          'A short pairing code appears automatically after local startup checks, with Copy code and the parent approval link beside it.',
          'Hidden student screens no longer cover setup, recovery or other visible controls.',
          'Pairing uses the configured account API address and shows a retry option for connection failures or expired codes.'
        ])
      }),
      child: Object.freeze({
        headline: 'Your connection code is ready for your parent',
        summary: 'No initial Get pairing code step. Keep this app open while your parent approves it.',
        highlights: Object.freeze([
          'The code is displayed automatically once setup is ready and the account service responds.',
          'Dashboard, parent setup and recovery buttons respond to normal mouse clicks.',
          'Approval checks continue automatically; expired codes clear safely and can be replaced with Try again.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.165', released_on: '2026-09-07', title: 'Private Cloud pairing clarity and collision protection',
      parent: Object.freeze({
        headline: 'One short code for the computer in front of you',
        summary: 'Private Cloud pairing now shows a clear creating or retry message and protects the short code against concurrent collisions. Private validation only; customer updates remain disabled.',
        highlights: Object.freeze([
          'Pairing codes remain easy to type as two four-character groups, without confusing I, O, 0, or 1 characters.',
          'The child screen keeps one active code visible until it expires, so a parent is not asked to choose between multiple codes for the same computer.',
          'The account service uses a database-wide unique code rule and safely retries the rare concurrent collision; one approved code can complete only its own child activation.',
          'If the child cannot contact the account service, the pairing card now explains the next step instead of appearing unresponsive. LAN records remain untouched.'
        ])
      }),
      child: Object.freeze({
        headline: 'A clearer code to give your parent',
        summary: 'Your parent will see one simple code to copy or type when connecting this private Cloud test.',
        highlights: Object.freeze([
          'The app says when it is creating a code and clearly explains if it needs an internet connection before trying again.',
          'Your code has two short groups and avoids look-alike letters and numbers.',
          'Keep the displayed code ready for your parent until it expires; the app checks for approval automatically.',
          'Your separate Cloud test and offline recovery stay separate from the existing school installation.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.164', released_on: '2026-09-07', title: 'Private Cloud reinstall recovery',
      parent: Object.freeze({
        headline: 'A leftover shortcut no longer blocks setup',
        summary: 'Fixes private setup error 1254 when finishing an earlier Cloud removal. Private validation only; customer updates remain disabled.',
        highlights: Object.freeze([
          'Unknown or unsafe Start-menu shortcuts are retained without blocking completed Cloud removal.',
          'Setup does not overwrite an existing Start-menu shortcut.',
          'Registration, signed-file verification, Guardian and health checks remain mandatory. LAN records are untouched.'
        ])
      }),
      child: Object.freeze({
        headline: 'Private setup recovery correction',
        summary: 'Your parent can recover the prior Cloud setup attempt without deleting retained files.',
        highlights: Object.freeze([
          'A leftover Start-menu shortcut no longer blocks your parent from finishing setup.',
          'Your Cloud pairing and offline recovery remain separate from the old school app.',
          'Keep your existing school installation until Cloud testing is complete.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.163', released_on: '2026-09-07', title: 'Private Cloud installation finalization fix',
      parent: Object.freeze({
        headline: 'Correct Windows installed-app registration',
        summary: 'Fixes the inherited Windows registration permissions behind private setup error 1213. This remains a private validation build, not a customer release.',
        highlights: Object.freeze([
          'New Cloud registration uses its own protected permissions instead of inheriting Windows compatibility write access.',
          'The side-by-side test can repair the known registration from earlier private versions; other registrations and family records are untouched.',
          'Setup distinguishes installed-app registration and offline repair-copy failures from recovery-task preparation.'
        ])
      }),
      child: Object.freeze({
        headline: 'A corrected private test installer',
        summary: 'Your parent can finish the Cloud setup test with the corrected Windows registration handling.',
        highlights: Object.freeze([
          'Your Cloud app still uses its own pairing and offline recovery code.',
          'Keep the existing school installation until testing is complete.',
          'Your parent should close only the Cloud test before retrying setup.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.162', released_on: '2026-09-07', title: 'Clearer private Cloud pairing',
      parent: Object.freeze({
        headline: 'A clearer path from child setup to parent approval',
        summary: 'Private Cloud setup now presents the pairing code in its own card with copy and parent-browser actions.',
        highlights: Object.freeze([
          'Three setup steps explain child-computer approval, assignment and offline recovery.',
          'Copy code uses only this computer’s current unexpired pairing code; the parent approval button opens the fixed BodeeGuard website.',
          'Test warnings and support details remain available in a tidier layout. Existing LAN records and Cloud Guardian protection are unchanged.'
        ])
      }),
      child: Object.freeze({
        headline: 'Easier parent setup',
        summary: 'Your parent can connect this private Cloud test without typing an account password into the child app.',
        highlights: Object.freeze([
          'A large pairing code is easier to read and copy.',
          'The app checks for approval automatically and explains when a code expires.',
          'Your parent still confirms offline recovery before school controls turn on.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.161', released_on: '2026-09-07', title: 'Private Cloud first-install recovery fix',
      parent: Object.freeze({
        headline: 'Correct first-install recovery task handling',
        summary: 'Fixes private setup error 1212 when Windows reports that the new Cloud recovery task has not been created yet. Actual installation acceptance remains pending.',
        highlights: Object.freeze([
          'First setup now recognizes the Windows missing-task result and can proceed to create its own recovery task.',
          'Existing task identity and permissions remain verified; permission failures and unknown tasks are not bypassed.',
          'The Cloud app and Guardian remain separate from the working LAN admin and family records. This build is private validation only.'
        ])
      }),
      child: Object.freeze({
        headline: 'Private Cloud setup correction',
        summary: 'Your parent can retry the separate online-connected school test with the corrected installer.',
        highlights: Object.freeze([
          'Keep your existing school installation until your parent approves a switch.',
          'Cloud setup still uses its own pairing and recovery code.',
          'Use the Cloud recovery shortcut shown in the test app to return to the desktop.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.160', released_on: '2026-09-07', title: 'Private Cloud side-by-side testing',
      parent: Object.freeze({
        headline: 'Test Cloud while keeping your LAN admin',
        summary: 'An explicit private validation build can share a standard Windows account with the existing LAN admin. This is not a customer release or family migration.',
        highlights: Object.freeze([
          'The separate Cloud app, Guardian service, profiles and recovery state remain isolated from the LAN installation and its records.',
          'Cloud parent exit keeps Ctrl+Shift+Q when available, with Ctrl+Shift+F10 as its displayed fallback. It does not claim the LAN Ctrl+Alt+Q shortcut.',
          'Setup failures now show a sanitized stage and diagnostic code after temporary-file cleanup.',
          'Customer updates and public promotion remain disabled; physical installation and full Windows lockdown still need testing.'
        ])
      }),
      child: Object.freeze({
        headline: 'A separate Cloud school test',
        summary: 'Your parent can test the online-connected school workspace without replacing the working LAN setup.',
        highlights: Object.freeze([
          'Keep using the existing school installation until your parent approves a switch.',
          'Cloud tests use their own parent-approved pairing and recovery code; old school records and logins are not copied.',
          'Ask your parent to use the displayed Cloud exit shortcut when returning to the desktop.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.159',
      released_on: '2026-09-05',
      title: 'Paintball joins family downloads',
      parent: Object.freeze({
        headline: 'A direct Paintball download on your home network',
        summary: 'The BodeeGuard install page now includes Family Paintball Showdown alongside the child-computer installer.',
        highlights: Object.freeze([
          'Open bodeeguard.local:3737/install from any family Windows computer to download Family Paintball Showdown directly.',
          'The page explains how up to 12 family members can host and join a match over the home network.',
          'The existing verified BodeeGuard child-computer installer remains unchanged and available at the top of the page.'
        ])
      }),
      child: Object.freeze({
        headline: 'Paintball is ready to download',
        summary: 'Your family download page now has a direct installer for Family Paintball Showdown.',
        highlights: Object.freeze([
          'Ask a parent to open bodeeguard.local:3737/install and choose Download Paintball for Windows.',
          'Install it on each computer that will play, then one player can host and everyone else can join.',
          'BodeeGuard still keeps Family Game Room schedules and play time in effect when you open the game there.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.158',
      released_on: '2026-09-04',
      title: 'More helpful conversations with both assistants',
      parent: Object.freeze({
        headline: 'Better follow-ups and more dependable math help',
        summary: 'The Parent Assistant and Math Coach now handle everyday follow-up questions more smoothly and recover more clearly when a connection fails.',
        highlights: Object.freeze([
          'The Parent Assistant remembers the preceding exchange for follow-up explanations and directions, and handles corrected choices such as a different time amount.',
          'When AI help is unavailable, the Parent Assistant can still explain known features and point you to the right setting on your computer or phone.',
          'Math Coach keeps track of the original problem, accepts work in either input box, and gives more focused help when a child remains confused.',
          'Math checks now stay tied to the original problem, and an AI-generated answer no longer counts as independently verified student work.',
          'Unanswered questions stay available to retry after connection problems. Parent approvals, visual settings, and assessment protections continue to apply.',
          'For unfamiliar follow-up requests, optional AI help may receive the preceding exchange. Parent conversation context expires after 20 minutes.'
        ])
      }),
      child: Object.freeze({
        headline: 'Keep going with Math Coach',
        summary: 'You can have a more natural conversation about your math problem without typing it again each time.',
        highlights: Object.freeze([
          'Reply with a short answer, your next step, or “I don’t understand.” Math Coach keeps the problem in mind.',
          'Type the work you tried in either box, including when you ask Math Coach to check it.',
          'If you are still confused, ask for a smaller step, a different explanation, or a similar example.',
          'If the connection fails, your question stays there so you can try again.'
        ])
      })
    }),
    Object.freeze({
      version: '1.2.157',
      released_on: '2026-09-04',
      title: 'Math help, safer assessments, and dependable time limits',
      parent: Object.freeze({
        headline: 'A complete Math Coach and stronger family controls',
        summary: 'This update adds parent-approved math tutoring, clearer oversight, and more reliable protection around assessments and scheduled media.',
        highlights: Object.freeze([
          'Math Coach is visible but locked by default. A child can request access, and a parent can allow it for that school day from the desktop or phone dashboard.',
          'Math Coach now includes exact answer checking, simpler explanations, visual fraction bars, balance scales, graphs, geometry diagrams, and read-aloud support.',
          'Parents can review Math Coach transcripts and progress observations, control usage limits, and optionally assign approved worksheet photos.',
          'Recognized digital quizzes and tests temporarily block Math Coach, including direct requests that try to bypass the child screen.',
          'Videos, music, and audiobooks now warn children ten minutes before a parent-set closing time and return them to the dashboard when time expires.',
          'School assessment windows have a protected return path so children are not left trapped on a completed LinkIt screen.'
        ])
      }),
      child: Object.freeze({
        headline: 'Meet your new Math Coach',
        summary: 'You can now ask for help understanding math homework after a parent unlocks Math Coach for the day.',
        highlights: Object.freeze([
          'Open Math Coach from your dashboard and tap Ask to use Math Coach. Your parent will see the request—no separate message is needed.',
          'Ask for a hint, a simpler explanation, another method, a similar example, or help checking the step you tried.',
          'Math Coach can show fractions, equations, graphs, and geometry visually and can read explanations aloud.',
          'Math Coach stays unavailable during a recognized quiz or test and returns after you leave the assessment.',
          'Videos, music, and audiobooks now give you a ten-minute warning and close at the time your parent selected.',
          'Completed school quizzes now have a safer way back to the school site.'
        ])
      })
    })
  ]);

  const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

  function compareVersions(left, right) {
    const parts = value => String(value || '').replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map(part => Number(part) || 0);
    const a = parts(left);
    const b = parts(right);
    for (let index = 0; index < 3; index += 1) {
      if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
    }
    return 0;
  }

  function validateAudience(value, label) {
    if (!value || typeof value !== 'object') return [`${label} release notes are missing`];
    const errors = [];
    if (String(value.headline || '').trim().length < 5) errors.push(`${label} headline is missing`);
    if (String(value.summary || '').trim().length < 10) errors.push(`${label} summary is missing`);
    if (!Array.isArray(value.highlights) || value.highlights.length < 1 || value.highlights.length > 10) {
      errors.push(`${label} highlights must contain 1 to 10 items`);
    } else if (value.highlights.some(item => String(item || '').trim().length < 10 || String(item).length > 500)) {
      errors.push(`${label} highlights contain an invalid item`);
    }
    return errors;
  }

  function validateReleaseNotes(releases = RELEASES) {
    if (!Array.isArray(releases) || releases.length < 1) return ['At least one release note is required'];
    const errors = [];
    const versions = new Set();
    releases.forEach((release, index) => {
      const version = String(release?.version || '').trim();
      if (!VERSION_PATTERN.test(version)) errors.push(`Release ${index + 1} has an invalid version`);
      if (versions.has(version)) errors.push(`Release ${version} is duplicated`);
      versions.add(version);
      if (!Number.isFinite(Date.parse(`${release?.released_on || ''}T12:00:00Z`))) errors.push(`Release ${version || index + 1} has an invalid date`);
      if (String(release?.title || '').trim().length < 5) errors.push(`Release ${version || index + 1} has no title`);
      errors.push(...validateAudience(release?.parent, `${version} parent`));
      errors.push(...validateAudience(release?.child, `${version} child`));
      if (index > 0 && compareVersions(releases[index - 1]?.version, version) <= 0) {
        errors.push('Release notes must be ordered newest first');
      }
    });
    return errors;
  }

  function assertReleaseNotesForVersion(version, releases = RELEASES) {
    const normalized = String(version || '').replace(/^v/i, '').trim();
    const errors = validateReleaseNotes(releases);
    if (errors.length) throw new Error(`Release notes are invalid: ${errors.join('; ')}`);
    const release = releases.find(item => item.version === normalized);
    if (!release) throw new Error(`BodeeGuard ${normalized} has no parent-and-child release notes`);
    return release;
  }

  function notesForUpgrade({ lastSeenVersion = '', currentVersion = RELEASES[0]?.version, audience = 'parent' } = {}) {
    const current = String(currentVersion || '').replace(/^v/i, '').trim();
    const seen = String(lastSeenVersion || '').replace(/^v/i, '').trim();
    if (!['parent', 'child'].includes(audience) || !VERSION_PATTERN.test(current)) return [];
    if (!seen) {
      const exact = RELEASES.find(item => item.version === current);
      return exact ? [{ version: exact.version, released_on: exact.released_on, title: exact.title, ...exact[audience] }] : [];
    }
    if (!VERSION_PATTERN.test(seen) || compareVersions(seen, current) >= 0) return [];
    return RELEASES
      .filter(item => compareVersions(item.version, seen) > 0 && compareVersions(item.version, current) <= 0)
      .map(item => ({ version: item.version, released_on: item.released_on, title: item.title, ...item[audience] }));
  }

  function releaseNotesMarkdown(version) {
    const release = assertReleaseNotesForVersion(version);
    const section = (heading, audience) => [
      `## ${heading}`,
      '',
      `**${audience.headline}**`,
      '',
      audience.summary,
      '',
      ...audience.highlights.map(item => `- ${item}`)
    ].join('\n');
    return [
      `# What’s new in BodeeGuard v${release.version}`,
      '',
      release.title,
      '',
      section('For parents', release.parent),
      '',
      section('For students', release.child)
    ].join('\n');
  }

  return Object.freeze({
    RELEASES,
    currentVersion: RELEASES[0]?.version || '',
    assertReleaseNotesForVersion,
    compareVersions,
    notesForUpgrade,
    releaseNotesMarkdown,
    validateReleaseNotes
  });
});
