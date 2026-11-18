/**
 * Seed data for a new wedding workspace: checklist categories, tasks,
 * milestones and the vendor booking list.
 *
 * Scheduling metadata:
 *   monthsBefore  Roadmap month relative to the wedding month.
 *                 For a September 2027 wedding: 10 = November 2026,
 *                 0 = September 2027, -1 = the month after the wedding.
 *   daysBefore    Optional precise offset, used once the exact date is known.
 *
 * Duplicates in the original brief are merged into one task. The merges are
 * listed in DUPLICATE_MERGES so they can be reviewed (and are shown in the README).
 */

import type { TaskPriority } from "@/lib/types";

export interface SeedTask {
  key: string;
  title: string;
  category: CategoryName;
  monthsBefore: number;
  daysBefore?: number;
  priority: TaskPriority;
  isBooking?: boolean;
  dependsOn?: string[];
  description?: string;
}

export const CATEGORIES = [
  "Venue and Contract",
  "Budget and Administration",
  "Guest List",
  "Photography and Videography",
  "Wedding Ceremony",
  "Attire and Beauty",
  "Florals and Decorations",
  "Catering and Desserts",
  "Music and Entertainment",
  "Stationery and Special Details",
  "Transportation and Travel",
  "Final Month",
  "After Wedding",
] as const;
export type CategoryName = (typeof CATEGORIES)[number];

// Month shorthands for a September wedding month.
const NOV = 10, DEC = 9, JAN = 8, FEB = 7, MAR = 6, APR = 5, MAY = 4, JUN = 3, JUL = 2, AUG = 1, SEP = 0, AFTER = -1;

type Opts = Partial<Pick<SeedTask, "daysBefore" | "isBooking" | "dependsOn" | "description">>;
const t = (
  key: string,
  title: string,
  category: CategoryName,
  monthsBefore: number,
  priority: TaskPriority,
  opts: Opts = {},
): SeedTask => ({ key, title, category, monthsBefore, priority, ...opts });

const V: CategoryName = "Venue and Contract";
const B: CategoryName = "Budget and Administration";
const G: CategoryName = "Guest List";
const P: CategoryName = "Photography and Videography";
const C: CategoryName = "Wedding Ceremony";
const A: CategoryName = "Attire and Beauty";
const F: CategoryName = "Florals and Decorations";
const K: CategoryName = "Catering and Desserts";
const M: CategoryName = "Music and Entertainment";
const S: CategoryName = "Stationery and Special Details";
const T: CategoryName = "Transportation and Travel";
const FM: CategoryName = "Final Month";
const AW: CategoryName = "After Wedding";

export const SEED_TASKS: SeedTask[] = [
  // Venue and Contract
  t("venue_deposit_confirmation", "Obtain written deposit confirmation", V, NOV, "critical", {
    description: "The first deposit is paid. Get written confirmation from Bel Air Bay Club and save it.",
  }),
  t("venue_store_contract", "Store signed contract", V, NOV, "high"),
  t("venue_payment_schedule", "Review payment schedule", V, NOV, "high"),
  t("venue_inclusions", "Review venue inclusions", V, NOV, "high"),
  t("venue_coordinator", "Confirm venue coordinator", V, NOV, "medium"),
  t("venue_vendor_restrictions", "Review vendor restrictions", V, NOV, "high"),
  t("venue_outside_catering", "Confirm outside catering policies", V, NOV, "high", {
    description: "Needed before booking dessert, Persian tea, or fruit vendors. Covers outside food rules too.",
  }),
  t("venue_insurance", "Confirm insurance requirements", V, DEC, "medium"),
  t("venue_setup_times", "Confirm setup and breakdown times", V, JAN, "medium"),
  t("venue_backup_plan", "Confirm outdoor ceremony backup plan", V, JAN, "high"),
  t("venue_music_end", "Confirm music and event end restrictions", V, JAN, "medium"),
  t("venue_parking_accessibility", "Confirm parking and accessibility", V, FEB, "medium"),
  t("venue_guest_count_deadline", "Confirm final guest count deadline", V, DEC, "high", {
    description: "The RSVP deadline should be set from this date.",
  }),
  t("venue_dance_floor", "Confirm dance floor arrangements", V, MAR, "low"),
  t("venue_food_tasting", "Confirm food tasting", V, MAR, "medium"),
  t("venue_floor_plan", "Review floor plan with venue", V, JUL, "medium"),
  t("venue_walkthrough", "Schedule walkthrough", V, AUG, "medium"),

  // Budget and Administration
  t("budget_set_total", "Set total budget", B, NOV, "critical"),
  t("budget_contributions", "Determine financial contributions", B, NOV, "high"),
  t("budget_contingency", "Create contingency reserve", B, NOV, "medium", { dependsOn: ["budget_set_total"] }),
  t("budget_record_deposit", "Record venue deposit", B, NOV, "high", {
    description: "Enter the actual deposit amount once you have it in writing.",
  }),
  t("budget_review_overall", "Review overall budget", B, DEC, "medium", { dependsOn: ["budget_set_total"] }),
  t("budget_payment_deadlines", "Track payment deadlines", B, APR, "medium"),
  t("budget_review_remaining", "Review budget and remaining payments", B, JUN, "medium"),
  t("budget_insurance", "Review wedding insurance", B, JAN, "low"),
  t("admin_vendor_contacts", "Create vendor contact list", B, JAN, "low"),
  t("admin_responsibilities", "Set planning responsibilities", B, NOV, "medium"),
  t("admin_monthly_meetings", "Schedule monthly meetings", B, NOV, "medium"),
  t("admin_research_planners", "Research planners", B, NOV, "high"),
  t("admin_decide_planner", "Decide whether to hire a planner or month-of coordinator", B, DEC, "high", {
    dependsOn: ["admin_research_planners"],
  }),
  t("admin_book_planner", "Book planner or coordinator", B, DEC, "high", {
    isBooking: true,
    dependsOn: ["admin_decide_planner"],
  }),
  t("admin_vendor_contracts", "Confirm major vendor contracts", B, FEB, "high"),

  // Guest List
  t("guests_draft", "Draft guest list", G, NOV, "high"),
  t("guests_confirm_count", "Confirm guest count", G, DEC, "high", {
    description: "Finalize the initial guest list and count.",
    dependsOn: ["guests_draft"],
  }),
  t("guests_addresses", "Collect addresses", G, DEC, "high", { dependsOn: ["guests_draft"] }),
  t("guests_plus_one", "Decide plus-one policy", G, NOV, "medium"),
  t("guests_children", "Decide children policy", G, NOV, "medium"),
  t("guests_out_of_town", "Identify out-of-town guests", G, DEC, "medium", { dependsOn: ["guests_draft"] }),
  t("guests_website", "Create wedding website", G, MAR, "medium"),
  t("guests_send_save_the_dates", "Send save-the-dates", G, DEC, "high", {
    dependsOn: ["stationery_design_save_the_dates", "guests_addresses"],
  }),
  t("guests_send_invitations", "Send invitations", G, JUN, "critical", {
    daysBefore: 84,
    description: "Time this against the RSVP deadline, which comes from the venue's final-count deadline.",
    dependsOn: ["stationery_order_invitations", "guests_addresses"],
  }),
  t("guests_track_rsvps", "Track RSVPs", G, JUL, "high"),
  t("guests_dietary", "Collect dietary restrictions", G, JUL, "medium"),
  t("guests_final_count", "Confirm final guest count", G, AUG, "critical", {
    description: "Due by the venue's final-count deadline. Adjust this date once you know it.",
    dependsOn: ["guests_track_rsvps"],
  }),
  t("guests_seating_chart", "Finalize seating chart", G, AUG, "high", { dependsOn: ["guests_track_rsvps"] }),
  t("guests_place_cards", "Prepare place cards", G, AUG, "medium", { dependsOn: ["guests_seating_chart"] }),

  // Photography and Videography
  t("photo_research", "Research photographers", P, NOV, "high"),
  t("video_research", "Research videographers", P, NOV, "high"),
  t("photo_compare", "Compare packages", P, NOV, "medium", { dependsOn: ["photo_research"] }),
  t("photo_galleries", "Review full galleries", P, NOV, "medium", { dependsOn: ["photo_research"] }),
  t("photo_book", "Book photographer", P, DEC, "critical", {
    isBooking: true,
    daysBefore: 300,
    dependsOn: ["photo_research"],
  }),
  t("video_book", "Book videographer", P, DEC, "high", {
    isBooking: true,
    dependsOn: ["video_research"],
  }),
  t("photo_engagement", "Plan engagement shoot", P, FEB, "low", { dependsOn: ["photo_book"] }),
  t("photo_inspiration", "Create photography inspiration board", P, MAR, "low"),
  t("photo_shot_list", "Prepare shot list", P, JUL, "medium"),
  t("photo_family_portraits", "Plan family portraits", P, MAY, "medium"),
  t("photo_first_look", "Discuss first look", P, MAY, "low"),
  t("photo_sunset", "Plan sunset portraits", P, MAY, "low"),
  t("photo_delivery", "Confirm delivery timelines", P, JUL, "low"),

  // Wedding Ceremony
  t("ceremony_bahai_requirements", "Confirm Bahá'í marriage requirements with appropriate institutions", C, JAN, "critical"),
  t("ceremony_consent_docs", "Confirm consent and documentation requirements", C, JAN, "critical"),
  t("ceremony_facilitator", "Choose ceremony facilitator/officiant", C, JAN, "high", { isBooking: true }),
  t("ceremony_civil", "Confirm civil marriage solemnization arrangements", C, JAN, "critical", {
    description: "Confirm separately from the Bahá'í requirements. Don't assume one person or step covers both.",
  }),
  t("ceremony_vows", "Plan required wedding vows", C, APR, "high"),
  t("ceremony_readings", "Select readings and prayers", C, APR, "medium"),
  t("ceremony_music", "Choose ceremony music", C, MAR, "medium"),
  t("ceremony_microphones", "Arrange ceremony microphones", C, JUL, "medium"),
  t("ceremony_procession", "Plan procession", C, MAY, "medium"),
  t("ceremony_ring_exchange", "Plan ring exchange", C, MAY, "low"),
  t("ceremony_family", "Plan family involvement", C, JUN, "medium"),
  t("ceremony_timeline_review", "Review ceremony timeline", C, MAY, "medium"),
  t("ceremony_schedule_rehearsal", "Schedule rehearsal", C, MAY, "medium"),
  t("ceremony_license", "Obtain marriage license", C, AUG, "critical", {
    daysBefore: 30,
    description: "Check the county clerk's requirements, including how long the license stays valid, before you pick a date to apply.",
  }),
  t("ceremony_license_filing", "Confirm license filing responsibilities", C, JUL, "high"),

  // Attire and Beauty
  t("attire_dress_shop", "Shop for wedding dress", A, DEC, "high"),
  t("attire_dress_order", "Order wedding dress", A, JAN, "high", {
    daysBefore: 270,
    dependsOn: ["attire_dress_shop"],
  }),
  t("attire_progress", "Review wedding attire progress", A, FEB, "medium"),
  t("attire_alterations", "Schedule alterations", A, MAY, "medium", { dependsOn: ["attire_dress_order"] }),
  t("attire_alterations_final", "Complete final alterations", A, AUG, "high", { dependsOn: ["attire_alterations"] }),
  t("attire_veil", "Choose veil", A, APR, "low"),
  t("attire_shoes", "Choose shoes", A, APR, "low"),
  t("attire_jewelry", "Choose jewelry", A, MAY, "low"),
  t("attire_reception_outfit", "Choose reception outfit if desired", A, MAY, "low"),
  t("attire_groom", "Choose groom's attire", A, APR, "medium"),
  t("attire_rings", "Buy wedding rings", A, MAY, "high"),
  t("beauty_book_hmu", "Book hair and makeup", A, JAN, "high", { isBooking: true }),
  t("beauty_trial", "Schedule beauty trial", A, MAY, "medium", { dependsOn: ["beauty_book_hmu"] }),
  t("beauty_skincare", "Plan skincare appointments", A, MAY, "low"),
  t("beauty_nails", "Plan nail appointments", A, AUG, "low"),
  t("attire_family", "Coordinate family outfits", A, JUN, "low"),
  t("attire_emergency_kit", "Prepare emergency kit", A, AUG, "low"),

  // Florals and Decorations
  t("decor_mood_board", "Create mood board", F, JAN, "medium"),
  t("decor_palette", "Select color palette", F, JAN, "medium"),
  t("floral_research", "Research florists", F, DEC, "high"),
  t("floral_book", "Book florist", F, JAN, "high", { isBooking: true, dependsOn: ["floral_research"] }),
  t("floral_ceremony", "Design ceremony floral arrangements", F, FEB, "medium", { dependsOn: ["floral_book"] }),
  t("decor_rentals_lighting_review", "Review rentals and lighting options", F, FEB, "medium"),
  t("decor_reception_layout", "Plan reception layout", F, MAR, "medium"),
  t("decor_aisle", "Design aisle décor", F, MAR, "low"),
  t("floral_centerpieces", "Design centerpieces", F, APR, "medium", { dependsOn: ["floral_book"] }),
  t("floral_sweetheart", "Design sweetheart table", F, APR, "low"),
  t("decor_design_decisions", "Confirm major design decisions", F, MAY, "high"),
  t("floral_bouquet", "Design bridal bouquet", F, MAY, "medium", { dependsOn: ["floral_book"] }),
  t("floral_boutonnieres", "Design boutonnieres", F, MAY, "low", { dependsOn: ["floral_book"] }),
  t("decor_candles", "Select candles", F, APR, "low"),
  t("decor_linens", "Select linens", F, APR, "low"),
  t("decor_chargers", "Select chargers", F, APR, "low"),
  t("decor_napkins", "Select napkins", F, APR, "low"),
  t("decor_welcome_sign", "Design welcome sign", F, JUN, "low"),
  t("decor_lighting", "Plan lighting", F, APR, "medium"),
  t("decor_rentals_confirm", "Confirm rentals", F, JUN, "medium"),
  t("floral_setup", "Confirm floral setup and teardown", F, AUG, "medium"),

  // Catering and Desserts
  t("catering_menu_review", "Review venue menu", K, MAR, "medium"),
  t("catering_appetizers", "Select appetizers", K, APR, "medium", { dependsOn: ["venue_food_tasting"] }),
  t("catering_dinner", "Select dinner menu", K, APR, "medium", { dependsOn: ["venue_food_tasting"] }),
  t("catering_dietary", "Confirm dietary accommodations", K, JUL, "medium", { dependsOn: ["guests_dietary"] }),
  t("catering_mocktails", "Design mocktail menu", K, MAY, "low"),
  t("dessert_research", "Research dessert vendors", K, DEC, "medium"),
  t("dessert_tea_review", "Review dessert and tea vendors", K, JAN, "medium", { dependsOn: ["dessert_research"] }),
  t("dessert_cake", "Decide on wedding cake", K, FEB, "medium"),
  t("dessert_varieties", "Select dessert varieties", K, APR, "medium"),
  t("tea_service", "Plan Persian tea service", K, APR, "medium", { dependsOn: ["venue_outside_catering"] }),
  t("fruit_station", "Plan fruit station", K, APR, "low", { dependsOn: ["venue_outside_catering"] }),
  t("catering_staff", "Confirm serving staff", K, JUL, "medium"),
  t("catering_display", "Confirm food display equipment", K, JUL, "low"),
  t("catering_power", "Confirm refrigeration and power access", K, JUL, "medium"),
  t("catering_counts", "Finalize food counts", K, AUG, "high", { dependsOn: ["guests_final_count"] }),
  t("catering_vendor_arrival", "Confirm vendor arrival and cleanup", K, AUG, "medium"),

  // Music and Entertainment
  t("dj_research", "Research DJs", M, NOV, "high"),
  t("dj_persian", "Confirm Persian music experience", M, NOV, "high", { dependsOn: ["dj_research"] }),
  t("dj_book", "Book DJ", M, DEC, "high", { isBooking: true, dependsOn: ["dj_research"] }),
  t("music_entrance", "Select entrance song", M, JUN, "low"),
  t("music_first_dance", "Select first dance song", M, JUN, "medium"),
  t("music_family_dances", "Decide on family dances", M, MAY, "low"),
  t("music_must_play", "Create must-play playlist", M, JUL, "medium"),
  t("music_do_not_play", "Create do-not-play playlist", M, JUL, "low"),
  t("music_dance_lighting", "Plan dance floor lighting", M, MAY, "low"),
  t("music_speeches", "Plan speeches", M, JUN, "medium"),
  t("music_mc", "Confirm MC announcements", M, AUG, "medium"),
  t("music_final_song", "Plan final song", M, JUL, "low"),

  // Stationery and Special Details
  t("stationery_design_save_the_dates", "Design save-the-dates", S, NOV, "high"),
  t("stationery_design_invitations", "Design invitations", S, MAR, "high"),
  t("stationery_finalize_design", "Finalize stationery design", S, APR, "medium"),
  t("stationery_order_invitations", "Order invitations", S, APR, "high", {
    dependsOn: ["stationery_design_invitations"],
  }),
  t("stationery_menus", "Design menus", S, JUN, "low"),
  t("stationery_table_numbers", "Design table numbers", S, JUN, "low"),
  t("stationery_seating_chart", "Design seating chart", S, JUN, "medium"),
  t("stationery_programs", "Design ceremony programs", S, JUN, "low"),
  t("details_guestbook", "Choose guestbook", S, MAY, "low"),
  t("details_card_box", "Choose card box", S, MAY, "low"),
  t("details_favors", "Choose favors if desired", S, MAY, "low"),
  t("details_welcome_gifts", "Plan welcome gifts", S, JUN, "low"),
  t("details_family_gifts", "Prepare family gifts", S, AUG, "low"),
  t("details_officiant_gift", "Prepare officiant gift", S, AUG, "low"),
  t("stationery_proofread", "Proofread all printed materials", S, JUN, "high"),

  // Transportation and Travel
  t("travel_hotels", "Research guest hotels and hotel blocks", T, JAN, "medium"),
  t("travel_getting_ready", "Reserve getting-ready suite", T, FEB, "medium"),
  t("travel_guest_transport", "Arrange guest transportation if needed", T, MAR, "low"),
  t("travel_couple_transport", "Arrange couple transportation", T, JUL, "medium"),
  t("travel_honeymoon", "Plan honeymoon", T, MAR, "medium"),
  t("travel_documents", "Check travel documents", T, MAY, "medium"),
  t("travel_accessibility", "Arrange accessibility accommodations", T, JUL, "medium"),

  // Final Month
  t("final_wedding_day_timeline", "Create wedding-day timeline", FM, JUL, "high"),
  t("final_ceremony_reception_timeline", "Finalize ceremony and reception timeline", FM, AUG, "high", {
    dependsOn: ["final_wedding_day_timeline"],
  }),
  t("final_vendor_arrival", "Confirm vendor arrival times", FM, AUG, "high", { daysBefore: 21 }),
  t("final_confirm_rsvps", "Confirm RSVPs", FM, AUG, "high", { daysBefore: 28 }),
  t("final_menu", "Confirm menu selections", FM, AUG, "high", { daysBefore: 21 }),
  t("final_pay_balances", "Pay final balances", FM, AUG, "critical", {
    description: "Use each contract's actual due date.",
  }),
  t("final_vendor_contact_sheet", "Send vendor contact sheet", FM, SEP, "medium", { daysBefore: 14 }),
  t("final_venue_details", "Confirm final venue details", FM, SEP, "high", { daysBefore: 10 }),
  t("final_tips", "Prepare tips", FM, SEP, "medium", { daysBefore: 7 }),
  t("final_weather", "Confirm weather backup", FM, SEP, "high", { daysBefore: 7 }),
  t("final_rehearsal", "Confirm rehearsal", FM, SEP, "high", { daysBefore: 7 }),
  t("final_setup", "Confirm setup responsibilities", FM, SEP, "medium", { daysBefore: 7 }),
  t("final_teardown", "Confirm teardown responsibilities", FM, SEP, "medium", { daysBefore: 7 }),
  t("final_pack_essentials", "Pack wedding essentials", FM, SEP, "medium", { daysBefore: 3 }),
  t("final_pack_rings_license", "Pack rings and license", FM, SEP, "critical", { daysBefore: 1 }),

  // After Wedding
  t("after_license_filing", "Confirm marriage license filing", AW, AFTER, "critical", {
    daysBefore: -7,
    description: "Confirm the actual filing deadline with the county clerk and that the license was returned.",
  }),
  t("after_thank_you", "Send thank-you cards", AW, AFTER, "medium"),
  t("after_rentals", "Return rentals", AW, AFTER, "medium", { daysBefore: -3 }),
  t("after_expenses", "Reconcile expenses", AW, AFTER, "medium"),
  t("after_backup_media", "Back up photos and videos", AW, AFTER, "medium"),
  t("after_album", "Order wedding album", AW, AFTER, "low"),
  t("after_keepsakes", "Preserve keepsakes", AW, AFTER, "low"),
  t("after_name_change", "Complete legal name changes if desired", AW, AFTER, "low"),
];

/** Brief items folded into another task, so the checklist has no duplicates. */
export const DUPLICATE_MERGES: { dropped: string; keptAs: string }[] = [
  { dropped: "Design invitations (Guest List)", keptAs: "Design invitations (Stationery)" },
  { dropped: "Design seating chart (Florals)", keptAs: "Design seating chart (Stationery)" },
  { dropped: "Research hotel blocks (Guest List)", keptAs: "Research guest hotels and hotel blocks" },
  { dropped: "Research guest hotels (Transportation)", keptAs: "Research guest hotels and hotel blocks" },
  { dropped: "Confirm parking (Transportation)", keptAs: "Confirm parking and accessibility" },
  { dropped: "Schedule tasting (Catering)", keptAs: "Confirm food tasting" },
  { dropped: "Confirm outside food rules (Catering)", keptAs: "Confirm outside catering policies" },
  { dropped: "Select ceremony songs (Music)", keptAs: "Choose ceremony music" },
  { dropped: "Prepare ceremony programs (Ceremony)", keptAs: "Design ceremony programs" },
  { dropped: "Finalize seating (Final Month)", keptAs: "Finalize seating chart" },
  { dropped: "Confirm final headcount (Final Month)", keptAs: "Confirm final guest count" },
];

export interface SeedMilestone {
  key: string;
  title: string;
  isCompleted?: boolean;
  taskKeys: string[];
}

export const SEED_MILESTONES: SeedMilestone[] = [
  { key: "said_yes", title: "We Said Yes", isCompleted: true, taskKeys: [] },
  { key: "venue_secured", title: "Venue Secured", isCompleted: true, taskKeys: ["venue_deposit_confirmation", "venue_store_contract"] },
  { key: "budget_finalized", title: "Budget Finalized", taskKeys: ["budget_set_total", "budget_contributions", "budget_contingency"] },
  { key: "guest_list_drafted", title: "Guest List Drafted", taskKeys: ["guests_draft"] },
  { key: "planner_booked", title: "Planner Booked", taskKeys: ["admin_book_planner"] },
  { key: "photographer_booked", title: "Photographer Booked", taskKeys: ["photo_book"] },
  { key: "videographer_booked", title: "Videographer Booked", taskKeys: ["video_book"] },
  { key: "dj_booked", title: "DJ Booked", taskKeys: ["dj_book"] },
  { key: "dress_purchased", title: "Wedding Dress Purchased", taskKeys: ["attire_dress_order"] },
  { key: "save_the_dates_sent", title: "Save-the-Dates Sent", taskKeys: ["guests_send_save_the_dates"] },
  {
    key: "major_vendors_secured",
    title: "Major Vendors Secured",
    taskKeys: ["admin_book_planner", "photo_book", "video_book", "dj_book", "floral_book", "beauty_book_hmu"],
  },
  { key: "invitations_sent", title: "Invitations Sent", taskKeys: ["guests_send_invitations"] },
  { key: "final_count_confirmed", title: "Final Guest Count Confirmed", taskKeys: ["guests_final_count"] },
  { key: "wedding_week", title: "Wedding Week", taskKeys: ["final_rehearsal", "final_pack_essentials", "final_pack_rings_license"] },
  { key: "wedding_day", title: "Wedding Day", taskKeys: [] },
  { key: "happily_ever_after", title: "Happily Ever After", taskKeys: ["after_license_filing", "after_thank_you"] },
];

export interface SeedVendorNeed {
  category: string;
  label: string;
  status: "not_booked" | "booked" | "not_needed";
}

export const SEED_VENDOR_NEEDS: SeedVendorNeed[] = [
  { category: "venue", label: "Venue", status: "booked" },
  { category: "planner", label: "Planner", status: "not_booked" },
  { category: "photographer", label: "Photographer", status: "not_booked" },
  { category: "videographer", label: "Videographer", status: "not_booked" },
  { category: "dj", label: "DJ", status: "not_booked" },
  { category: "florist", label: "Florist", status: "not_booked" },
];
