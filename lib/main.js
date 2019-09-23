"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const { GitHub, context } = require('@actions/github');
const parse = require('parse-diff');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get information on everything
            const token = core.getInput('github-token', { required: true });
            const github = new GitHub(token, {});
            const PR_number = context.payload.pull_request.number;
            // Check if the body contains required string
            const bodyContains = core.getInput('bodyContains');
            if (context.payload.pull_request.body.indexOf(bodyContains) < 0) {
                core.setFailed("The body of the PR does not contain " + bodyContains);
                createComment(github, context, PR_number, "We need to have the string " + bodyContains + " in the body of the pull request");
            }
            const bodyDoesNotContain = core.getInput('bodyDoesNotContain');
            if (bodyDoesNotContain && context.payload.pull_request.body.indexOf(bodyDoesNotContain) >= 0) {
                core.setFailed("The body of the PR should not contain " + bodyDoesNotContain);
                createComment(github, context, PR_number, "You should have eliminated *" + bodyDoesNotContain + "* from the body of the pull request");
            }
            const diffContains = core.getInput('diffContains');
            const diff_url = context.payload.pull_request.diff_url;
            const result = yield github.request(diff_url);
            const files = parse(result.data);
            const filesChanged = +core.getInput('filesChanged');
            if (filesChanged && files.length != filesChanged) {
                core.setFailed("You should change exactly " + filesChanged + " file(s)");
                createComment(github, context, PR_number, "This PR needs to change exactly *" + filesChanged + "* files. Please redo this PR to fix that");
            }
            var changes = '';
            var additions = 0;
            files.forEach(function (file) {
                additions += file.additions;
                file.chunks.forEach(function (chunk) {
                    chunk.changes.forEach(function (change) {
                        if (change.add) {
                            changes += change.content;
                        }
                    });
                });
            });
            if (changes.indexOf(diffContains) < 0) {
                core.setFailed("The added code does not contain " + diffContains);
                createComment(github, context, PR_number, "This repo requires to have *" + diffContains + "* in the changed code. Please redo this PR to fix that");
            }
            else {
                core.exportVariable('diff', changes);
                core.setOutput('diff', changes);
            }
            const linesChanged = +core.getInput('linesChanged');
            if (linesChanged && (additions != linesChanged)) {
                const this_msg = "You should change exactly " + linesChanged + " lines(s) and you have changed " + additions;
                core.setFailed(this_msg);
                createComment(github, context, PR_number, this_msg);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
function createComment(github, context, PR_number, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        yield github.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: PR_number,
            body: msg
        });
    });
}
