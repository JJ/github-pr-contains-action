import * as core from '@actions/core';
const {GitHub, context} = require('@actions/github')
const parse = require('parse-diff')

async function run() {
  try {
      const bodyContains = core.getInput('bodyContains')
      if ( context.payload.pull_request.body.indexOf( bodyContains) < 0  ) {
          core.setFailed("The body of the PR does not contain " + bodyContains);
      }
      const diffContains = core.getInput('diffContains')
      const token = core.getInput('github-token', {required: true})
      const github = new GitHub(token, {} )
      const diff_url = context.payload.pull_request.diff_url
      const result = await github.request( diff_url )
      const files = parse(result.data)
      const filesChanged = +core.getInput('filesChanged')
      if ( filesChanged && files.length != filesChanged ) {
          core.setFailed( "You should change exactly " + filesChanged + " file(s)");
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
      } else {
          core.exportVariable('diff',changes )
          core.setOutput('diff',changes )
      }

      const linesChanged = +core.getInput('linesChanged')
      console.log( "Additions = " + additions )
      if ( linesChanged && additions != linesChanged ) {
          core.setFailed( "You should change exactly " + linesChanged + " lines(s) and you have changed " + additions );
      }

  } catch (error) {
      core.setFailed(error.message);
  }
}

run();
