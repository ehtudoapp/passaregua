/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "deleteRule": null,
    "updateRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "deleteRule": "",
    "updateRule": null
  }, collection)

  return app.save(collection)
})
