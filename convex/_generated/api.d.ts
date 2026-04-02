/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as dashboard from "../dashboard.js";
import type * as debugIngest from "../debugIngest.js";
import type * as hello from "../hello.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as members from "../members.js";
import type * as profile from "../profile.js";
import type * as quizProgress from "../quizProgress.js";
import type * as roomModeration from "../roomModeration.js";
import type * as roomMusic from "../roomMusic.js";
import type * as rooms from "../rooms.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  chat: typeof chat;
  dashboard: typeof dashboard;
  debugIngest: typeof debugIngest;
  hello: typeof hello;
  http: typeof http;
  identity: typeof identity;
  members: typeof members;
  profile: typeof profile;
  quizProgress: typeof quizProgress;
  roomModeration: typeof roomModeration;
  roomMusic: typeof roomMusic;
  rooms: typeof rooms;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
