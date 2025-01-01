# Db instance

The `Db` instance is a nodejs instance of sqlite that is used to interact with the database.
The db is stored by default at `var/data/app.sqlite`.

The `Db` instance is accessible from the state object from `state.instances.appDbInstance.connection`.

