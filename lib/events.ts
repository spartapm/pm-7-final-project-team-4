"use client";

import { track } from "./format";

/** 이벤트 트래킹 명세서의 이벤트명·파라미터. */
export const analytics = {
  sign_up_start() {
    track("sign_up_start");
  },
  sign_up() {
    track("sign_up", { method: "kakao" });
  },
  sign_up_fail(fail_reason: "auth_cancel" | "auth_error" | "network") {
    track("sign_up_fail", { fail_reason });
  },
  onboarding_pet_type_select(pet_type: "dog" | "cat") {
    track("onboarding_pet_type_select", { pet_type });
  },
  onboarding_complete(pet_type: "dog" | "cat", journey_type: "before" | "after") {
    track("onboarding_complete", { pet_type, journey_type });
  },
  onboarding_error(error_field: "species" | "name" | "journey") {
    track("onboarding_error", { error_field });
  },
  home_view(journey_type: "before" | "after") {
    track("home_view", { journey_type });
  },
  home_node_click(node_index: number, item_id: string) {
    track("home_node_click", { node_index, item_id });
  },
  nav_tab_click(tab_name: "home" | "list" | "memory" | "profile") {
    track("nav_tab_click", { tab_name });
  },
  list_view(item_count: number, journey_type: "before" | "after") {
    track("list_view", { item_count, journey_type });
  },
  list_add_button_click(journey_type: "before" | "after") {
    track("list_add_button_click", { journey_type });
  },
  list_item_create(item_id: string, journey_type: "before" | "after") {
    track("list_item_create", { item_id, journey_type });
  },
  list_item_edit(item_id: string) {
    track("list_item_edit", { item_id });
  },
  list_item_delete(item_id: string) {
    track("list_item_delete", { item_id });
  },
  list_item_row_click(item_id: string) {
    track("list_item_row_click", { item_id });
  },
  record_edit_view() {
    track("record_edit_view", { entry_point: "list" });
  },
  record_field_interact(field_name: "date" | "title" | "story" | "photo") {
    track("record_field_interact", { field_name });
  },
  record_photo_add(photo_count: number) {
    track("record_photo_add", { photo_count });
  },
  record_photo_upload_fail(fail_reason: "network" | "size" | "format") {
    track("record_photo_upload_fail", { fail_reason });
  },
  record_temp_save() {
    track("record_temp_save");
  },
  record_temp_save_fail(fail_reason: "network" | "server") {
    track("record_temp_save_fail", { fail_reason });
  },
  record_complete(journey_type: "before" | "after", has_photo: boolean, char_count: number) {
    track("record_complete", { journey_type, has_photo, char_count });
  },
  record_complete_fail(fail_reason: "network" | "server" | "validation") {
    track("record_complete_fail", { fail_reason });
  },
  record_complete_modal_action(params: { next_action: "to_list" | "to_memory" } | { item_id: string }) {
    track("record_complete_modal_action", params);
  },
  record_retry_click(retry_count: number) {
    track("record_retry_click", { retry_count });
  },
  record_exit_modal_action(item_id: string) {
    track("record_exit_modal_action", { item_id });
  },
  memory_view(card_count: number, journey_type: "before" | "after") {
    track("memory_view", { card_count, journey_type });
  },
  memory_sort_change(sort_type: "latest" | "oldest") {
    track("memory_sort_change", { sort_type });
  },
  memory_card_click(item_id: string) {
    track("memory_card_click", { item_id });
  },
  memory_card_delete(item_id: string) {
    track("memory_card_delete", { item_id });
  },
  memory_detail_view(entry_point: "home" | "memory") {
    track("memory_detail_view", { entry_point });
  },
  memory_edit_click(item_id: string) {
    track("memory_edit_click", { item_id });
  },
  memory_edit_view(item_id: string) {
    track("memory_edit_view", { item_id });
  },
  memory_photo_add(mem_photo_count: number) {
    track("memory_photo_add", { mem_photo_count });
  },
  memory_photo_upload_fail(mem_fail_reason: "mem_network" | "mem_size" | "mem_format") {
    track("memory_photo_upload_fail", { mem_fail_reason });
  },
  memory_complete(item_id: string) {
    track("memory_complete", { item_id });
  },
  memory_complete_fail(fail_reason: "network" | "server" | "validation") {
    track("memory_complete_fail", { fail_reason });
  },
  memory_exit_modal_action(item_id: string) {
    track("memory_exit_modal_action", { item_id });
  },
  memory_complete_modal_action(item_id: string) {
    track("memory_complete_modal_action", { item_id });
  },
  profile_view(journey_type: "before" | "after") {
    track("profile_view", { journey_type });
  },
  profile_edit_complete(changed_fields: string) {
    track("profile_edit_complete", { changed_fields });
  },
  journey_switch_confirm(from_type: "before" | "after", to_type: "before" | "after") {
    track("journey_switch_confirm", { from_type, to_type });
  },
  journey_switch_cancel() {
    track("journey_switch_cancel");
  },
  logout_complete() {
    track("logout_complete");
  },
  account_delete_complete() {
    track("account_delete_complete");
  },
};
