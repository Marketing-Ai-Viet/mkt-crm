import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { NextFunction, Request, Response } from 'express';

@Injectable()
export class TimelineActivityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TimelineActivityMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    const pruneSelectionEnabled = process.env.PRUNE_SELECTION_ENABLED || 'true';

    if (pruneSelectionEnabled === 'false') return next();
    this.logger.log('TimelineActivityMiddleware invoked');
    try {
      if (req.path === '/graphql' && req.method === 'POST') {
        // Remove timelineActivities from the query instead of blocking
        await this.removeTimelineActivitiesFromQuery(req);
      }
    } catch (error) {
      this.logger.error(
        'Error in TimelineActivity removal middleware:',
        error as Error,
      );
    }

    next();
  }

  private async removeTimelineActivitiesFromQuery(req: Request): Promise<void> {
    const body = req.body;

    if (!body || !body.query) {
      return;
    }

    // Check if query name includes TimelineActivity
    if (body.operationName && body.operationName.includes('TimelineActivity')) {
      this.logger.log(
        `Replacing ${body.operationName} operation with minimal query`,
      );
      body.query = '{ __typename }';
      body.operationName = null;
      if (body.variables) {
        body.variables = {};
      }

      return;
    }

    // Check for dedicated TimelineActivity queries
    const queryNameMatch = body.query.match(/query\s+(\w+TimelineActivity\w*)/);

    if (queryNameMatch) {
      const queryName = queryNameMatch[1];

      this.logger.log(
        `Detected dedicated TimelineActivity query: ${queryName}`,
      );

      // Replace the entire query with a minimal valid query
      body.query = '{ __typename }';
      body.operationName = null;
      if (body.variables) {
        body.variables = {};
      }

      return;
    }

    // Check if there's timelineActivities in a multi-purpose query
    if (body.query.includes('timelineActivities')) {
      this.logger.log('Removing timelineActivities from multi-purpose query');

      // Match simple timelineActivities field
      const simplePattern = /\s*timelineActivities\s*{[^}]*}\s*/g;

      // Match timelineActivities with parameters
      const withParamsPattern =
        /\s*timelineActivities\s*\([^)]*\)\s*{[^}]*}\s*/g;

      // Match multi-level nested structures by tracking braces
      const complexPattern =
        /\s*timelineActivities\s*(\([^)]*\))?\s*{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}\s*/g;

      // Apply all patterns
      let modifiedQuery = body.query;

      modifiedQuery = modifiedQuery.replace(complexPattern, ' ');
      modifiedQuery = modifiedQuery.replace(withParamsPattern, ' ');
      modifiedQuery = modifiedQuery.replace(simplePattern, ' ');

      body.query = modifiedQuery;

      // If the query becomes empty or invalid due to removal, adjust accordingly
      if (body.query.trim() === '' || !this.isValidQuery(body.query)) {
        // Set to a minimal valid GraphQL query if removal makes it invalid
        body.query = '{ __typename }';
        body.operationName = null;
      }

      //this.logger.log('Modified query:', body.query);
    }

    // If it's explicitly a FindManyTimelineActivities operation
    if (body.operationName === 'FindManyTimelineActivities') {
      this.logger.log('Replacing FindManyTimelineActivities operation');
      // Replace with a minimal query
      body.query = '{ __typename }';
      body.operationName = null;

      // Remove variables if they only relate to timelineActivities
      if (body.variables) {
        body.variables = {};
      }
    }
  }

  private isValidQuery(query: string): boolean {
    // Simple validation to ensure the query doesn't have unbalanced brackets
    const openBrackets = (query.match(/{/g) || []).length;
    const closeBrackets = (query.match(/}/g) || []).length;

    return openBrackets === closeBrackets && openBrackets > 0;
  }
}
