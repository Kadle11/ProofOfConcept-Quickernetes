// Require dependencies
const opentelemetry = require('@opentelemetry/api');
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { GrpcInstrumentation } = require('@opentelemetry/instrumentation-grpc');

const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'gRPC-tunnel',
    }),
});

registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
        new GrpcInstrumentation(),
    ]
});

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

const globalTracerProvider = opentelemetry.trace.setGlobalTracerProvider(provider);

// Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
provider.register();

module.exports = (serviceName) => {

    const exporter = new JaegerExporter({
        serviceName,
        endpoint: 'http://localhost:14268/api/traces'
    });

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    return opentelemetry.trace.getTracer('grpc-tunnel-tracer');

};

// Optionally register instrumentation libraries
// const provider = new BasicTracerProvider({
//     plugins: {
//         grpc: {
//             enabled: true,
//             path: '@opentelemetry/plugin-grpc'
//         }
//     }
// });

// const exporter = new JaegerExporter({
//     endpoint: 'http://localhost:14268/api/traces',
// });

// provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

// provider.register();