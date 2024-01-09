#!/usr/bin/env -S deno run --allow-read --allow-write

// TODO: handle the permissions better... somehow?

import { parse } from "https://deno.land/std/flags/mod.ts";

let getUsage = () => {
    let usage = `
Command-line interface for LibResilient.

This script creates a common interface to CLI actions implemented by LibResilient plugins.

Usage:
    ${new URL('', import.meta.url).toString().split('/').at(-1)} [options] [plugin-name [plugin-options]]

Options:

    -h, --help [plugin-name]
        Print this message, if no plugin-name is given.
        If plugin-name is provided, print usage information of that plugin.

`

    return usage
}


let getPluginActionUsage = (action, action_name) => {
    
    // initialize
    let options = ""
    let positional = ""
    let positional_desc = ""
    
    if ("arguments" in action) {
        for (const opt in action.arguments) {
            if (opt == '_') {
                continue
            }
            options += `\n        --${opt}`
            if ("default" in action.arguments[opt]) {
                options += ` (default: ${action.arguments[opt].default})`
            }
            options += `\n            ${action.arguments[opt].description}`
            options += `\n`
        }
    
        if ('_' in action.arguments) {
            if ('name' in action.arguments._) {
                positional = ` <${action.arguments._.name}...>`
            } else {
                positional = ' <item...>'
            }
            positional_desc = `

        ${positional}
            ${action.arguments._.description}`
        }
    }
    
    let usage = `    ${action_name}${ (options != "") ? " [options...]" : "" }${positional}
        ${action.description}${positional_desc}
${options}`

    return usage
}


let getPluginUsage = (plugin) => {
    let usage = `
CLI plugin:
    ${plugin.name}

Plugin Description:
    ${plugin.description.replace('\n', '\n    ')}
    
Usage:
    ${new URL('', import.meta.url).toString().split('/').at(-1)} [general-options] ${plugin.name} [plugin-action [action-options]]

General Options:

    -h, --help [plugin-name]
        Print this message, if no plugin-name is given.
        If plugin-name is provided, print usage information of that plugin.

Actions and Action Options:

`
    for (const action in plugin.actions) {
        usage += getPluginActionUsage(plugin.actions[action], action) + '\n'
    }
    
    return usage
}

let parsePluginActionArgs = (args, argdef) => {
    
    var plugin_args_config = {
        boolean: [],
        string: [],
        alias: {},
        collect: [],
        negatable: [],
        unknown: null,
        default: {
        }
    }
    
    for (const [argname, argconfig] of Object.entries(argdef)) {
        if (argname == '_') {
            continue;
        }
        if ( ("collect" in argconfig) && (argconfig.collect === true) ) {
            plugin_args_config.collect.push(argname)
        }
        if ( ("string" in argconfig) && (argconfig.string === true) ) {
            plugin_args_config.string.push(argname)
        }
        if ( ("boolean" in argconfig) && (argconfig.boolean === true) ) {
            plugin_args_config.boolean.push(argname)
        }
        if ( ("negatable" in argconfig) && (argconfig.negatable === true) ) {
            plugin_args_config.negatable.push(argname)
        }
        if ("default" in argconfig) {
            plugin_args_config.default[argname] = argconfig.default
        }
    }
    
    var parsed = parse(args, plugin_args_config)
        
    var result = []
    
    // we want to keep the order of arguments
    // as defined in the plugin cli code
    for (const argname of Object.keys(argdef)) {
        if (argname in parsed) {
            result.push(parsed[argname])
        }
    }
    
    // we're done
    return result
}

// assuming:
// - the first unknown argument is the name of the plugin
// - plugins live in ../plugins/<plugin-name>/cli.js, relative to lrcli.js location
// - only one plugin loaded per invocation, at least for now
// 
// we *always* pass arguments to plugins as arrays of strings,
// even if we only got one value

let main = async (args) => {
    
    var parsed_args = parse(
        args,
        {
            default: {
                h: false,
            },
            stopEarly: true,
            boolean: [ "h" ],
            string: [],
            alias: {
                h: [ "help" ]
            },
            collect: [],
            negatable: [],
            // a function which is invoked with a command line parameter not defined
            // in the options configuration object. If the function returns false,
            // the unknown option is not added to parsedArgs.
            unknown: null
        }
    );
    
    // no unknown parsed args? that means we have no plugin specified
    if (parsed_args._.length == 0) {
        console.log(getUsage())
        if (parsed_args.help) {
            return 0;
        } else {
            return 1;
        }
    }

    // try loading the plugin
    let plugin
    try {
        plugin = await import(`../plugins/${parsed_args._[0]}/cli.js`);
    } catch (e) {
        // unable to load the plugin? bail with info
        console.log(`\n*** ${e} ***`)
        console.log(getUsage())
        return 2
    }

    // if we only had exactly one unknown arg, we only have the plugin name
    // but no info from the user what to do with it
    // → print plugin usage and exit
    if (parsed_args._.length == 1) {
        if (!parsed_args.help) {
            console.log('\n*** No action specified for plugin ***')
        }
        console.log(getPluginUsage(plugin))
        if (parsed_args.help) {
            return 0;
        } else {
            return 3;
        }
    }
    
    let action = parsed_args._[1]
    if ( ! (action in plugin.actions) ) {
        var exit_code = 0
        if (!['--help', '-h'].includes(action)) {
            console.log(`\n*** Action not supported: ${action} ***`)
            exit_code = 4
        }
        console.log(getPluginUsage(plugin))
        return exit_code
    }

    if (['--help', '-h'].includes(parsed_args._[2])) {
        console.log(getPluginUsage(plugin))
        return 0
    }

    var parsed_plugin_args = parsePluginActionArgs(
                                // removing the plugin name and the method name
                                parsed_args._.slice(2),
                                // empty object in case arguments key does not exist
                                plugin.actions[action].arguments || {}
                            )

    // not using console.log here because we want the *exact* output
    // without any extra ending newlines
    try {
        await Deno.stdout.write(
                new TextEncoder().encode(
                    await plugin.actions[action].run(...parsed_plugin_args)
                )
            )
        return 0
    } catch (e) {
        console.log(`\n*** ${e} ***`)
        console.log(getPluginUsage(plugin))
        return 5
    }
}

// export the main function
export {
    main
}

// run only if we're the main module
if (import.meta.main) {
    Deno.exit(await main(Deno.args))
}
