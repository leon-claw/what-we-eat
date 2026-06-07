# Room Dish Snapshots Design

## Goal

Move multiplayer room selection away from client-local dish IDs and toward server-owned dish snapshots. A room should keep the exact dish data that was available when the room was created or edited, so later global/personal dish changes do not alter an in-progress or historical room.

## Current Problem

Rooms currently store only `dishIds`. Each client reconstructs room dishes by matching those IDs against its own `builtInDishes + userDishes`. This breaks when a room includes a custom dish that other clients do not have locally, and it makes historical room results depend on whatever the current client happens to know.

## Proposed Behavior

- The room API accepts full dish objects when a room is created.
- The server clones those dish objects into a new `room_dishes` table.
- The public room payload includes `dishes: Dish[]` and still includes `dishIds` for compatibility.
- Votes continue to use `dishId`, but in room mode that ID refers to the room dish snapshot ID.
- Adding a dish during the waiting phase inserts a full snapshot into `room_dishes`.
- Once selection starts, room dishes are frozen by the existing waiting/selecting guard.

## Data Model

`room_dishes` stores:

- `id`: snapshot dish ID used by room votes.
- `room_code`: owning room.
- `source_dish_id`: original built-in or personal dish ID.
- Full dish fields: name, cuisine, type, image URL, tags, description, spicy level, price level, prep time.
- `created_by_member_id`, `created_at`, `updated_at`.

Existing `rooms.dish_ids_json` remains as a compatibility mirror containing the snapshot IDs. Future work can remove it after all consumers use `room.dishes`.

## Client Model

`Room` gains `dishes: Dish[]`. Room UI uses `currentRoom.dishes` for multiplayer selection, progress, result summaries, and display. Single-player mode keeps using `builtInDishes + local userDishes`.

## Validation

- A room created with custom dish objects must return those custom dishes from the API even if the client does not have them locally.
- A room dish added during waiting must appear in `room.dishes` for all clients.
- `npm run build` must pass.
