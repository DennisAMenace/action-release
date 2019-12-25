require('child_process')
    .execSync(
        'npm install @actions/core @actions/github conventional-changelog-cli',
        { cwd: __dirname }
    );

const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');

(async () => {
    try {
        const api = new github.GitHub(core.getInput('token'));
        const tag = core.getInput('tag');
        const name = core.getInput('name');
        const body = core.getInput('body');
        const verbose = core.getInput('verbose');
        const draft = core.getInput('draft') == 'true';
        const prerelease = core.getInput('prerelease') == 'true';
        const files = core.getInput('files').split(' ').map(asset => asset.split(':'));

        let release = null;

        function log(text) {
            if (verbose) {
                console.log(text);
            }
        }

        //log(github.context);
        log(github);

        // First let us try to get the release.
        try {
            release = await api.repos.getReleaseByTag({
                ...github.context.repo,
                tag: tag,
                owner: github.context.actor
            });

            console.log('The tag exists.');
        }
        catch (error) {
            if (error.name != 'HttpError' || error.status != 404) {
                throw error;
            }
        }

        // Create a release if it doesn't already exists.
        if (!release) {
            var releaseOptions = {
                ...github.context.repo,
                tag_name: tag,
                //target_commitish: 'master',
                target_commitish: github.context.sha,
                name,
                body,
                prerelease: prerelease,
                draft: draft
            };

            log(releaseOptions);

            release = await api.repos.createRelease();
        }

        // Go through all the specified files and upload to the release.
        for (const [source, target, type] of files) {

            log(source);
            log(target);
            log(type);

            const data = fs.readFileSync(source);

            log(data);

            api.repos.uploadReleaseAsset({
                url: release.data.upload_url,
                headers: {
                    ['content-type']: 'raw',
                    ['content-length']: data.length
                },
                name: target,
                file: data
            });
        }
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
})();