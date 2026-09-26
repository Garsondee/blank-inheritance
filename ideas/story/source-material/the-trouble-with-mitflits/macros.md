# Macros

> **SOURCE MATERIAL — from the original campaign, not Blank Inheritance canon.**
> Extracted 2026-09-24 from the old Foundry world *"The Trouble with Mitflits"* (`old server data/abomination-vault/`):
> Ingram's heavily homebrewed Pathfinder 2e run of Paizo's *Abomination Vaults*, played from June 2022 into 2024, whose
> player characters became the Directorate's four founders. It is the ground this campaign was built on.
> Nothing here is canon on its own: where it disagrees with `ideas/story/bible/LEDGER.md` or the dossiers,
> **those win**. Text is transcribed from the Foundry data as it was found (HTML stripped, links reduced to
> their labels); typos are the originals'.

146 macros. Most are stock PF2e/module helpers; the campaign-specific ones are reproduced in full.

## Campaign-specific

### Deadtide for Otari *(script)*

```js
const playlist = game.playlists.getName("Musical Stings");
const sound = playlist.sounds.getName("Imminent Danger");
const light1 = canvas.scene.lights.get("OjJ1RGGXvWbptPi3");
const light2 = canvas.scene.lights.get("3GO1CvMROPZBzeKH");

    if (sound) await playlist.playSound(sound);
    if (light1) await light1.update({hidden: !light1.data.hidden})
    if (light2) await light2.update({hidden: !light2.data.hidden})
```

### Hat of Disguise *(script)*

```js
game.pf2e.rollItemMacro("7VHUMGIjMZxFBVp8");
```

### Straight Through the Middle!!! *(script)*

```js
game.pf2e.rollItemMacro("FvAbprsw21lju0EQ");
```

### Loot Generator *(script)*

```js
/** This compendium link macro will always call the most recent version from the compendium included with this module meaning you do not need to reimport newer versions. The source of the macros that get called is https://gitlab.com/symonsch/my-foundryvtt-macros/-/tree/main/PF2e */
async function _executeMacroByName(
    macroName,
    compendiumName = "xdy-pf2e-workbench.asymonous-benefactor-macros-internal"
) {
    const pack = game.packs.get(compendiumName);
    if (pack) {
        const macro_data = (await pack.getDocuments()).find((i) => i.data.name === macroName)?.toObject();
        if (macro_data) {
            const temp_macro = new Macro(macro_data);
            temp_macro.data.permission.default = CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
            temp_macro.execute();
        } else {
            ui.notifications.error("Macro " + macroName + " not found");
        }
    } else {
        ui.notifications.error("Compendium " + compendiumName + " not found");
    }
}
_executeMacroByName('XDY DO_NOT_IMPORT Loot Generator');

/* This compendium link macro is based on one originally posted by DrentalBot: https://discord.com/channels/880968862240239708/880975811279204402/910490804554973274; and modified by Mark Pearce https://discord.com/channels/880968862240239708/880969174661353484/972962446098702376 */
```

### Pact Broker *(script)*

```js
game.pf2e.rollItemMacro("nA9bEujWkxbqqtNN");
```

### Travel Duration *(script)*

```js
const tokens = canvas.tokens.controlled;
if (tokens.length === 0) {
    ui.notifications.error(`You must select at least one pc token`);
} else {
    game.pf2e.gm.launchTravelSheet(tokens.map((p) => p.actor));
}
```

### Display Glyph Casting *(script)*

```js
await Hotbar.toggleDocumentSheet("JournalEntry.CnkRPl6C6Uwv197n");
```

### Select random potions *(script)*

```js
const table = game.tables.find(t => t.name === "1d100 Potions");

table.draw();
```

### Host Spirit *(script)*

```js
game.pf2e.rollItemMacro("yXk0G8l0leaqHh1U");
```

### XP *(script)*

```js
/**
 * @typedef {{data: {data: {details: {level: number|string|undefined|null, isComplex: boolean}}, type: string}}} Hazard
 */
/**
 * @param actors {Array<Hazard>}
 * @param type {string}
 * @returns {Array<HazardLevel>}
 */
function getHazardLevels(actors) {
    return actors.filter((a) => a.data.type === "hazard");
}
/**
 * @typedef {{data: {data: {details: {level: {value: number|string|undefined|null}}}, type: string}}} Actor
 */
/**
 * @param actors {Array<Actor>}
 * @param type {string}
 * @returns {Array<number>}
 */
function getLevels(actors, type) {
    return actors.filter((a) => a.data.type === type).map((a) => parseInt(a.data.data.details.level.value ?? "1", 10));
}
/**
 * @param xp {XP}
 * @returns {string}
 */
function dialogTemplate(xp) {
    return `
<h2>XP</h2>
<table>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</th>
        <td>${xp.partySize}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</th>
        <td>${xp.partyLevel}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats."+xp.rating)} (${xp.totalXP} XP)</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
        <td>${xp.xpPerPlayer} XP</td>
    </tr>
</table>
<h2>${game.i18n.localize("PF2E.Encounter.Budget.EncounterBudget")}</h2>
<table class="pf2-table">
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.XPBudget")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.XPNeeded")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.trivial")}</td>
        <td>${xp.encounterBudgets.trivial}</td>
        <td>${xp.encounterBudgets.trivial - xp.totalXP}</td>
        <td>40</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.low")}</td>
        <td>${xp.encounterBudgets.low}</td>
        <td>${xp.encounterBudgets.low - xp.totalXP}</td>
        <td>60</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.moderate")}</td>
        <td>${xp.encounterBudgets.moderate}</td>
        <td>${xp.encounterBudgets.moderate - xp.totalXP}</td>
        <td>80</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.severe")}</td>
        <td>${xp.encounterBudgets.severe}</td>
        <td>${xp.encounterBudgets.severe - xp.totalXP}</td>
        <td>120</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.extreme")}</td>
        <td>${xp.encounterBudgets.extreme}</td>
        <td>${xp.encounterBudgets.extreme - xp.totalXP}</td>
        <td>160</td>
    </tr>
</table>
<h2>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureXPAndRole")}</h2>
<table class="pf2-table">
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevel")}</th>
        <th>XP</th>
        <th>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.SuggestedRole")}</th>
    </tr>
    <tr>
        <td>${xp.partyLevel - 4}</td>
        <td>10</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-4")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 3}</td>
        <td>15</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-3")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 2}</td>
        <td>20</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-2")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 1}</td>
        <td>30</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-1")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel}</td>
        <td>40</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.0")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 1}</td>
        <td>60</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.1")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 2}</td>
        <td>80</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.2")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 3}</td>
        <td>120</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.3")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 4}</td>
        <td>160</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.4")}</td>
    </tr>
</table>`;
}
const askLevelPopupTemplate = () => {
    const partySize = parseInt(localStorage.getItem("xpMacroPartySize") ?? 4, 10);
    const partyLevel = parseInt(localStorage.getItem("xpMacroPartyLevel") ?? 1, 10);
    return `
    <form>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</label>
        <input id="party-size" name="party-size" type="number" value="${partySize}">
    </div>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</label>
        <input id="party-level" name="party-level" type="number" value="${partyLevel}">
    </div>
    </form>
    `;
};
/**
 * @param partyLevel {number}
 * @param partySize {number}
 * @param npcLevels {Array<number>}
 * @param hazardLevels {Array<HazardLevel>}
 */
function showXP(partyLevel, partySize, npcLevels, hazardLevels) {
    const xp = game.pf2e.gm.calculateXP(partyLevel, partySize, npcLevels, hazardLevels, {
        proficiencyWithoutLevel: game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel",
    });
    new Dialog({
        title: "XP",
        content: dialogTemplate(xp),
        buttons: {},
    }).render(true);
}
/**
 * @param npcLevels {Array<number>}
 * @param hazardLevels {Array<HazardLevel>}
 */
function askPartyLevelAndSize(npcLevels, hazardLevels) {
    new Dialog({
        title: "Party Information",
        content: askLevelPopupTemplate,
        buttons: {
            no: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            },
            yes: {
                icon: '<i class="fas fa-calculator"></i>',
                label: "Calculate XP",
                callback: ($html) => {
                    const partySize = parseInt($html[0].querySelector('[name="party-size"]').value, 10) ?? 1;
                    const partyLevel = parseInt($html[0].querySelector('[name="party-level"]').value, 10) ?? 1;
                    // persist for future uses
                    localStorage.setItem("xpMacroPartySize", partySize);
                    localStorage.setItem("xpMacroPartyLevel", partyLevel);
                    showXP(partyLevel, partySize, npcLevels, hazardLevels);
                },
            },
        },
        default: "yes",
    }).render(true);
}
function main() {
    const actors = canvas.tokens.controlled.map((a) => a.actor);
    const npcLevels = getLevels(actors, "npc");
    const pcLevels = getLevels(actors, "character");
    const hazardLevels = getHazardLevels(actors);
    if (npcLevels.length === 0 && hazardLevels.length === 0) {
        ui.notifications.error(`You must select at least one npc and/or hazard token and optionally all PC tokens`);
        return;
    }
    if (pcLevels.length === 0) {
        askPartyLevelAndSize(npcLevels, hazardLevels);
    } else {
        showXP(pcLevels[0], pcLevels.length, npcLevels, hazardLevels);
    }
}
main();
```

## All macro names

A02 - Drawbridge Collapse; A08 - Stairs; A24 - Flickerwisp Reveal; A24 - Pier Collapse; Add Effect; Advanced Countdown; Aerial Boomerang; Aid; Archives of Nethys; Athletics: Arcane Slam; Avoid Notice; B22 - Barricade; B31 - Skeletal Giant; Balance; Base Kinesis; Basic Action Macros; Brain Drain; Brass Ear; C01 - Secret Door; Cast a Spell; Casters Spellbook; Chromotherapy; Command; Conceal an Object; Conditions Manager; Cover Tracks; Create a Diversion; D06 - Bath; D12 - Breaking the Seal; D20a - Vision; D20b - Vision; D20c - Vision; D20d - Vision; Deadtide for Otari; Demoralize; Display GM Screen; Display Glyph Casting; Drain Bonded Item; E02 - Rusty Grate; E06 - Bridge; E10 - Bridge; E13 - Mimics; E22 - Viscous Black Pudding; E25 - Bone Gladiator; Earn Income; Effect: Minimum Frightened; Ettercap: Web; Example Filtered Menu; F02 - Rusty Grate; Feint; Final Spite; Flinging Updraft; Flying Flame; Four Winds; G03 - Infernal Barrier; Grapple; H02 - Wisp Reveal; Hat of Disguise; Host Spirit; I04 - Secret Door; J03 - Secret Door; J10 - Visions; J11 - Visions; Level Based DCs; Light Template 110812; Light Template 173046; Lightning Dash; Lights; Loot Generator; Macro: Effect: Aid; Macro: Effect: Cover; Macro: Effect: Follow The Expert; Magic Circle; Magical Rune; Morlock: +2 Status to All Saves vs Disease and Poison; New Macro; Nimble Dodge; No Escape; One For All; Open Summoning Menu; PF2E Generate NPC UI; Pact Broker; Persistent Conditions; Quick Alchemy; Rage; Reach Spell; Recall_Knowledge; Repair; River Drake: Caustic Mucus; Scorching Column; Select random potions; Simulate Falling; Skill Roller; Skills Roller; Spell DCs by Level; Spell Effect: Inspire Courage (3 rounds); Spell Effect: Inspire Defense (3 rounds); Spin Tale; Steal; Straight Through the Middle!!!; Strike: +1 Striking Shortbow; Strike: Fist; Sudden Charge; Take Cover; Thermal Nimbus; Travel Duration; Treat Wounds; Treat Wounds and Battle Medicine; Use Scroll or Wand; Wand of Magic Missile (Level 1); XP; Zozzlarin: Telepathy 100 feet; customizableBasicActionMacros; customizableProceduralChecks
