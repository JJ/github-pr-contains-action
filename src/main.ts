import * as core from '@actions/core';
const {GitHub, context} = require('@actions/github')
const parse = require('parse-diff')

async function run() {
    try {
        // get information on everything
        const token = core.getInput('github-token', {required: true})
        const github = new GitHub(token, {} )
        const PR_number = context.payload.pull_request.number
        
        // Check if the body contains required string
        const bodyContains = core.getInput('bodyContains')

        if ( context.payload.pull_request.body.indexOf( bodyContains) < 0  ) {
            core.setFailed("The body of the PR does not contain " + bodyContains)
	    createComment( github, context, PR_number, "We need to have the string " + bodyContains + " in the body of the pull request" )
        }

        const bodyDoesNotContain = core.getInput('bodyDoesNotContain')
        if ( bodyDoesNotContain && context.payload.pull_request.body.indexOf( bodyDoesNotContain) >= 0  ) {
            core.setFailed("The body of the PR should not contain " + bodyDoesNotContain);
	    createComment( github, context, PR_number, "You should have eliminated *" + bodyDoesNotContain + "* from the body of the pull request" )

        }
        
      const diffContains = core.getInput('diffContains')
      const diff_url = context.payload.pull_request.diff_url
      const result = await github.request( diff_url )
      const files = parse(result.data)
      const filesChanged = +core.getInput('filesChanged')
      if ( filesChanged && files.length != filesChanged ) {
          core.setFailed( "You should change exactly " + filesChanged + " file(s)");
	  createComment( github, context, PR_number, "This PR needs to change exactly *" + filesChanged + "* files. Please redo this PR to fix that" )
      }

      var changes = ''
      var additions:number = 0
      files.forEach(function(file) {
	  additions += file.additions
          file.chunks.forEach( function ( chunk ) {
              chunk.changes.forEach( function (change ) {
                  if ( change.add ) {
                      changes += change.content
                  }
              })
          })
      })
      if ( changes.indexOf( diffContains ) < 0 ) {
          core.setFailed( "The added code does not contain " + diffContains);
	  createComment( github, context, PR_number, "This repo requires to have *" + diffContains + "* in the changed code. Please redo this PR to fix that" )
      } else {
          core.exportVariable('diff',changes )
          core.setOutput('diff',changes )
      }

      const linesChanged = +core.getInput('linesChanged')
	if ( linesChanged && ( additions != linesChanged ) ) {
	    const this_msg = "You should change exactly " + linesChanged + " lines(s) and you have changed " + additions
          core.setFailed( this_msg );
	  createComment( github, context, PR_number, this_msg )
      }

  } catch (error) {
      core.setFailed(error.message);
  }
}

run();

async function createComment( github, context, PR_number, msg: string ) {
    await github.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: PR_number,
        body: msg  });

}
