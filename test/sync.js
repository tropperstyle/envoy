'use strict';
/* globals testUtils */

var PouchDB = require('pouchdb'),
  assert = require('assert');

// Generate a bunch of documents, and store those in a local
// PouchDB. Kick off a push replication, and then query remote
// end to ensure that all generated documents made it acrosss.
describe('test single user sync', function () {
  var dbs = {};
  beforeEach(function (done) {
    dbs = {local: 'testdb', secondary: 'testdb2'};
    testUtils.cleanup([dbs.local, dbs.secondary], done);
  });

  afterEach(function (done) {
    testUtils.cleanup([dbs.local, dbs.secondary], done);
  });

  it('push replication', function () {
    this.timeout(20000);

    var username = 'push_repl_test';
    var remoteURL = null;

    var local = new PouchDB(dbs.local);
    var remote = null;
    var docs = testUtils.makeDocs(5);
    
    return testUtils.createUser().then(function(remoteURL){
      remote = new PouchDB(remoteURL);
      return remote.allDocs();
    }).then(function (response) {
        assert.equal(response.rows.length, 0);
        return local.bulkDocs(docs);
      }).then(function () {
        return local.replicate.to(remote);
      }).then(function () {
        // Verify that all documents reported as pushed are present
        // on the remote side.
        return remote.allDocs();
      }).then(function (response) {
        assert.equal(response.rows.length, docs.length);
      });
  });

  it('pull replication', function () {
    this.timeout(20000);

    var username = 'pull_repl_test';
    var remoteURL = null;

    var local = new PouchDB(dbs.local);
    var remote = null;
    var docs = testUtils.makeDocs(5);

    return testUtils.createUser().then(function(remoteURL){
      remote = new PouchDB(remoteURL);
      return remote.bulkDocs(docs);
    }).then(function () {
        return local.replicate.from(remote);
      }).then(function () {
        return local.allDocs();
      }).then(function (response) {
        assert.equal(response.total_rows, docs.length);
      });
  });

  it('multi-client replication', function () {
    this.timeout(20000);

    var username = 'multi_repl_test';
    var remoteURL = null;

    var client1 = new PouchDB(dbs.local);
    var client2 = new PouchDB(dbs.secondary);
    var remote = null;
    var docs = testUtils.makeDocs(5);

    return testUtils.createUser().then(function(remoteURL){
      remote = new PouchDB(remoteURL);
      return client1.bulkDocs(docs);
    }).then(function () {
        return client1.replicate.to(remote);
      }).then(function () {
        return client2.replicate.from(remote);
      }).then(function () {
        return client2.allDocs();
      }).then(function (response) {
        assert.equal(response.total_rows, docs.length);
      });
  });
});
