let testAction = () => {
    return "testAction run!"
}

const pluginName = "simple-plugin"
const pluginDescription = "A simple plugin for testing"
const pluginVersion = "0.0.1"
const pluginActions = {
    'test-action': {
        run: testAction,
        description: "Test action of a test plugin"
    }
}

export {
    pluginName as name,
    pluginDescription as description,
    pluginVersion as version,
    pluginActions as actions
}
