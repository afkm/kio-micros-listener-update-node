#!/usr/bin/env node

'use strict';

const Path = require('path');
const _ = require('lodash');

var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver(process.env.NEO4J_HOST, neo4j.auth.basic(process.env.NEO4J_UID, process.env.NEO4J_PWD));

driver.onCompleted = function() {
  console.log('Successfully connected to Neo4J');
};

driver.onError = function(error) {
  console.log('Neo4J Driver instantiation failed', error);
};

var session = driver.session();


require('seneca')()
  .use('seneca-amqp-transport')
  .add('cmd:updateNode,cuid:*,nodeTitle:*,nodeAttributes:*', function(message, done) {
    var properties = "{ ";
    properties += "cuid:'" + message.cuid + "'";
    properties += ", title:'" + message.nodeTitle + "'";
    _.forOwn(message.nodeAttributes, function(value, key) {
      properties += ", " + key + ":'" + value + "'";
    });
    properties += " }";
    var queryString = "MATCH (n { cuid:'" + message.cuid + "'}) SET n = " + properties;
    console.log(queryString);
    session
      .run(queryString)
      .then(function(result) {
        session.close();
        var status = "Successfully updated Node " + message.cuid;
        return done(null, {
          status
        });
      })
      .catch(function(error) {
        console.log(error);
      });
  })
  .listen({
    type: 'amqp',
    pin: 'cmd:updateNode,cuid:*,nodeTitle:*,nodeAttributes:*',
    url: process.env.AMQP_URL
  });
