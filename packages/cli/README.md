# Intro about Effect Cli

- how to run
- deploy
- arguments

- unversial pipe combinator
    - withAliase
    - withDescription'


- Command
    - You can inline handler as the third argument or use the pipe combinator to add it with the with handler method. 
- Args
    postional arguments
- options
    flags
    and optional values
    you can use Pipe compilator to add at the end options.optional which will make that option optional. (Might be possible to do the same thing with arts. )

- quirks that could be resolved later
you must supply optiosn before args
folling the POSIX utility-syntax guidelines 9
could be resolved later


- sub-commands (maybe later)


- running
```ts

const appLayer = NodeContext.layer

cliApp(process.argv)
.pipe(
    Effect.provide(appLayer),
    NodeRuntime.runMain
)
```